/**
 * Dolibarr → OTS Leaves Sync Service (18.6.0).
 *
 * One-way read-only mirror from Dolibarr `llx_holiday` into OTS `LeaveRequest`.
 * Mirrors the shape of `sync-dolibarr-employees.ts`.
 *
 * Rules (confirmed with Walid):
 *  - Pull ALL historic holidays, not just recent ones.
 *  - Only Dolibarr statut=3 (APPROVED) rows land in OTS. Draft / pending /
 *    refused / cancelled are skipped (counted in rowsSkipped).
 *  - Rows land as `status=APPROVED` with `source=DOLIBARR`, bypassing the
 *    native approval chain. All approver columns remain null.
 *  - Idempotency key is `dolibarrHolidayId`. Re-runs update in place.
 *  - Employee match is by `Employee.employmentId = String(llx_holiday.fk_user)`.
 *    Unmatched rows are counted in `employeesNotFound` and skipped.
 *  - Leave type match is `fk_type` label → OTS `LeaveType.code` via an
 *    explicit map (the Dolibarr catalogue is small and stable). Unmatched
 *    types bump `typesNotMapped` and fall back to a permissive default so
 *    the row still lands — the warning is surfaced in soft warnings.
 *  - Dedup with Google-Sheet attendance: for each synced leave, count
 *    overlapping `AttendanceRecord` days within the leave window and
 *    increment `attendanceDaysOverridden`. The payroll calculator uses this
 *    same logic at calc time to make Dolibarr leaves "win" over sheet codes.
 *
 * Authentication: the Dolibarr client is created from env at call time unless
 * the caller passes one in (useful for tests + cron).
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import {
  DolibarrClient,
  DolibarrHoliday,
  DolibarrHolidayType,
  DolibarrHolidaysNotAvailableError,
  createDolibarrClient,
} from '@/lib/dolibarr/dolibarr-client';

export { DolibarrHolidaysNotAvailableError };

// ============================================================================
// TYPES
// ============================================================================

type HardError = { dolibarrHolidayId: string; message: string };
type SoftWarning = { dolibarrHolidayId: string; field?: string; message: string };

export interface LeaveSyncResult {
  syncLogId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  employeesNotFound: number;
  typesNotMapped: number;
  attendanceDaysOverridden: number;
  hardErrors: HardError[];
  softWarnings: SoftWarning[];
  durationMs: number;
}

// ============================================================================
// FIELD MAPPING
// ============================================================================

/** Convert a Dolibarr Unix timestamp (seconds) to JS Date. Null-safe. */
function tsToDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000);
}

/**
 * Dolibarr holiday type labels (from llx_c_holiday_types) → OTS LeaveType.code.
 * Source: Walid's screenshot of the Dolibarr config screen, 18.6.0 kickoff.
 *
 * Both label and code are matched case-insensitively, with leading numbering
 * like "01-", "02-" stripped, because Dolibarr UI labels change often but
 * the internal codes are what the API returns.
 */
const DOLIBARR_TYPE_LABEL_TO_CODE: Record<string, string> = {
  'leave with permission': 'PERMITTED',
  'permitted leave': 'PERMITTED',
  'leave without permission': 'UNPERMITTED',
  'unpermitted leave': 'UNPERMITTED',
  'unpaid leave': 'UNPERMITTED',
  'sick leave': 'SICK',
  'sickness': 'SICK',
  'annual leave': 'ANNUAL',
  'annual leave (notice period: 30 days)': 'ANNUAL',
  'paid leave': 'ANNUAL',
  'urgent leave': 'URGENT',
};

function normaliseLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/^\d+\s*[-.)]\s*/, '') // strip leading "01-", "02)" etc.
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a fk_type → LeaveType.code map by reading the Dolibarr holiday types
 * catalogue and matching labels against DOLIBARR_TYPE_LABEL_TO_CODE. Called
 * once per sync run.
 */
async function buildTypeMap(
  client: DolibarrClient,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  let types: DolibarrHolidayType[] = [];
  try {
    types = await client.getHolidayTypes();
  } catch (err) {
    logger.warn({ err }, '[Dolibarr Leaves Sync] REST holiday type catalogue unavailable');
  }
  for (const t of types) {
    const id = t.id ?? t.rowid;
    if (id === undefined || id === null) continue;
    const label = normaliseLabel(typeof t.label === 'string' ? t.label : null);
    const code = DOLIBARR_TYPE_LABEL_TO_CODE[label];
    if (code) {
      result.set(String(id), code);
    }
  }
  return result;
}

// ============================================================================
// SYNC ENTRY POINT
// ============================================================================

export interface RunLeaveSyncOptions {
  triggeredById: string;
  triggerSource?: 'manual' | 'cron';
  client?: DolibarrClient;
}

export async function runDolibarrLeaveSync(
  opts: RunLeaveSyncOptions,
): Promise<LeaveSyncResult> {
  const start = Date.now();
  const client = opts.client ?? createDolibarrClient();

  // -- Start sync log row (status = RUNNING) --
  const syncLog = await prisma.dolibarrLeaveSyncLog.create({
    data: {
      triggeredById: opts.triggeredById,
      triggerSource: opts.triggerSource ?? 'manual',
      status: 'RUNNING',
    },
  });

  const hardErrors: HardError[] = [];
  const softWarnings: SoftWarning[] = [];
  let rowsRead = 0;
  let rowsCreated = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;
  let employeesNotFound = 0;
  let typesNotMapped = 0;
  let attendanceDaysOverridden = 0;
  let apiResponseMs: number | null = null;

  try {
    // -- Preload LeaveType catalogue (code → id) for fast lookup --
    const leaveTypes = await prisma.leaveType.findMany({
      where: { archivedAt: null },
      select: { id: true, code: true },
    });
    const leaveTypeByCode = new Map<string, string>();
    for (const lt of leaveTypes) leaveTypeByCode.set(lt.code, lt.id);

    // Fallback leave type: prefer PERMITTED, then ANNUAL, then the first.
    const fallbackLeaveTypeId =
      leaveTypeByCode.get('PERMITTED') ??
      leaveTypeByCode.get('ANNUAL') ??
      leaveTypes[0]?.id;
    if (!fallbackLeaveTypeId) {
      throw new Error('No LeaveType rows exist — cannot land Dolibarr leaves.');
    }

    // -- Build Dolibarr fk_type → code map --
    const dolibarrTypeMap = await buildTypeMap(client);

    // -- Fetch all holidays via the Dolibarr REST API --
    const apiStart = Date.now();
    const holidays: DolibarrHoliday[] = await client.getAllHolidays();
    apiResponseMs = Date.now() - apiStart;
    rowsRead = holidays.length;

    for (const apiHoliday of holidays) {
      const dolibarrHolidayIdStr = String(apiHoliday.id ?? '');
      try {
        // -- Skip non-approved statuses --
        const statut = String(apiHoliday.statut ?? '');
        if (statut !== '3') {
          rowsSkipped++;
          continue;
        }

        // -- Resolve employee by fk_user → employmentId --
        const fkUser = apiHoliday.fk_user;
        if (fkUser === undefined || fkUser === null || fkUser === '') {
          employeesNotFound++;
          softWarnings.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            field: 'fk_user',
            message: 'Holiday has no fk_user',
          });
          continue;
        }
        const employmentId = String(fkUser);
        const employee = await prisma.employee.findUnique({
          where: { employmentId },
          select: { id: true },
        });
        if (!employee) {
          employeesNotFound++;
          softWarnings.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            field: 'fk_user',
            message: `No OTS Employee with employmentId=${employmentId}`,
          });
          continue;
        }

        // -- Resolve dates --
        const startDate = tsToDate(apiHoliday.date_debut);
        const endDate = tsToDate(apiHoliday.date_fin);
        if (!startDate || !endDate) {
          hardErrors.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            message: 'Missing date_debut or date_fin',
          });
          continue;
        }
        if (endDate < startDate) {
          hardErrors.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            message: 'date_fin before date_debut',
          });
          continue;
        }

        // -- Resolve leave type --
        const fkType = apiHoliday.fk_type !== undefined && apiHoliday.fk_type !== null ? String(apiHoliday.fk_type) : '';
        let leaveTypeCode: string | undefined;
        if (fkType) leaveTypeCode = dolibarrTypeMap.get(fkType);
        let leaveTypeId: string | undefined;
        if (leaveTypeCode) leaveTypeId = leaveTypeByCode.get(leaveTypeCode);
        if (!leaveTypeId) {
          leaveTypeId = fallbackLeaveTypeId;
          typesNotMapped++;
          softWarnings.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            field: 'fk_type',
            message: `Dolibarr fk_type=${fkType || '(null)'} did not map to any OTS LeaveType; used fallback`,
          });
        }

        // -- Compute calendar / working days --
        const calendarDays =
          Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        // Working days: same as native flow — exclude Fridays only. Public
        // holidays are NOT excluded here because Dolibarr's own export
        // already accounts for the employee's requested working range.
        let workingDays = 0;
        const cur = new Date(startDate);
        while (cur <= endDate) {
          if (cur.getUTCDay() !== 5) workingDays++;
          cur.setUTCDate(cur.getUTCDate() + 1);
        }

        const description =
          typeof apiHoliday.description === 'string' && apiHoliday.description.trim() !== ''
            ? apiHoliday.description.trim().slice(0, 1000)
            : null;

        const dolibarrIdNum =
          typeof apiHoliday.id === 'number' ? apiHoliday.id : parseInt(dolibarrHolidayIdStr, 10);
        if (!Number.isFinite(dolibarrIdNum)) {
          hardErrors.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            message: 'Cannot parse holiday id as integer',
          });
          continue;
        }

        // -- Upsert by dolibarrHolidayId --
        const existing = await prisma.leaveRequest.findUnique({
          where: { dolibarrHolidayId: dolibarrIdNum },
          select: { id: true },
        });

        if (!existing) {
          await prisma.leaveRequest.create({
            data: {
              employeeId: employee.id,
              leaveTypeId,
              startDate,
              endDate,
              calendarDays,
              workingDays: workingDays.toString(),
              reason: description,
              status: 'APPROVED',
              submittedAt: tsToDate(apiHoliday.date_create) ?? new Date(),
              source: 'DOLIBARR',
              dolibarrHolidayId: dolibarrIdNum,
              balanceAtRequest: null,
              wasOverBalance: false,
              createdById: opts.triggeredById,
            },
          });
          rowsCreated++;
        } else {
          await prisma.leaveRequest.update({
            where: { id: existing.id },
            data: {
              employeeId: employee.id,
              leaveTypeId,
              startDate,
              endDate,
              calendarDays,
              workingDays: workingDays.toString(),
              reason: description,
              status: 'APPROVED',
              updatedById: opts.triggeredById,
            },
          });
          rowsUpdated++;
        }

        // -- Attendance dedup counter --
        // How many days in [startDate, endDate] have an AttendanceRecord
        // for this employee? The payroll calculator will use the leave as
        // source of truth; here we just record the overlap for visibility.
        const overlap = await prisma.attendanceRecord.count({
          where: {
            employeeId: employee.id,
            date: { gte: startDate, lte: endDate },
          },
        });
        attendanceDaysOverridden += overlap;
      } catch (rowError) {
        const msg = rowError instanceof Error ? rowError.message : String(rowError);
        hardErrors.push({ dolibarrHolidayId: dolibarrHolidayIdStr, message: msg });
        logger.error(
          { dolibarrHolidayId: dolibarrHolidayIdStr, error: rowError },
          '[Dolibarr Leaves Sync] Row failed',
        );
      }
    }

    const finalStatus: 'SUCCESS' | 'PARTIAL' = hardErrors.length > 0 ? 'PARTIAL' : 'SUCCESS';

    await prisma.dolibarrLeaveSyncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        status: finalStatus,
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsSkipped,
        employeesNotFound,
        typesNotMapped,
        attendanceDaysOverridden,
        hardErrors: hardErrors.length > 0 ? (hardErrors as unknown as Prisma.InputJsonValue) : undefined,
        softWarnings: softWarnings.length > 0 ? (softWarnings as unknown as Prisma.InputJsonValue) : undefined,
        apiResponseMs,
      },
    });

    logger.info(
      {
        syncLogId: syncLog.id,
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsSkipped,
        employeesNotFound,
        typesNotMapped,
        attendanceDaysOverridden,
        hardErrors: hardErrors.length,
      },
      '[Dolibarr Leaves Sync] Completed',
    );

    return {
      syncLogId: syncLog.id,
      status: finalStatus,
      rowsRead,
      rowsCreated,
      rowsUpdated,
      rowsSkipped,
      employeesNotFound,
      typesNotMapped,
      attendanceDaysOverridden,
      hardErrors,
      softWarnings,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: err, syncLogId: syncLog.id }, '[Dolibarr Leaves Sync] Failed');
    await prisma.dolibarrLeaveSyncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        status: 'FAILED',
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsSkipped,
        employeesNotFound,
        typesNotMapped,
        attendanceDaysOverridden,
        hardErrors: [{ dolibarrHolidayId: 'SYNC', message: msg }] as unknown as Prisma.InputJsonValue,
        softWarnings: softWarnings.length > 0 ? (softWarnings as unknown as Prisma.InputJsonValue) : undefined,
        apiResponseMs,
      },
    });
    throw err;
  }
}
