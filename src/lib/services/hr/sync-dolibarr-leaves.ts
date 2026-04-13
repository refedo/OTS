/**
 * Dolibarr → OTS Leaves Sync Service (18.8.0 — direct MySQL).
 *
 * One-way read-only mirror from Dolibarr `<prefix>holiday` into OTS
 * `LeaveRequest`. Reads the Dolibarr database directly via a mysql2 pool
 * because the Dolibarr REST `/api/index.php/holidays` endpoint is
 * unreliable on Walid's install — see 18.7.1 → 18.7.6 changelog for the
 * full diagnostic saga that forced us to bypass REST for this one
 * endpoint specifically.
 *
 * Rules (unchanged from 18.6.0):
 *  - Pull ALL historic holidays, not just recent ones.
 *  - Only Dolibarr statut=3 (APPROVED) rows land in OTS. The SQL query
 *    filters them upstream, not this code.
 *  - Rows land as `status=APPROVED` with `source=DOLIBARR`, bypassing the
 *    native approval chain. All approver columns remain null.
 *  - Idempotency key is `dolibarrHolidayId`. Re-runs update in place.
 *  - Employee match is `Employee.employmentId = String(<prefix>holiday.fk_user)`.
 *    Unmatched rows are counted in `employeesNotFound` and skipped.
 *  - Leave type match is Dolibarr `<prefix>c_holiday_types.code` →
 *    OTS `LeaveType.code` via a direct map (below). The code is read
 *    directly from the JOIN so we don't need a second round-trip to the
 *    type catalogue like the pre-18.8.0 REST path did.
 *  - Dedup with Google-Sheet attendance: for each synced leave, count
 *    overlapping `AttendanceRecord` days and increment
 *    `attendanceDaysOverridden`. The payroll calculator uses the same
 *    logic at calc time so Dolibarr leaves "win" over sheet codes.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import {
  fetchApprovedDolibarrHolidays,
  DolibarrDbNotConfiguredError,
  type DolibarrHolidayDbRow,
} from '@/lib/dolibarr/dolibarr-db';

export { DolibarrDbNotConfiguredError };

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
// LEAVE TYPE MAPPING
// ============================================================================

/**
 * Primary path: Dolibarr `c_holiday_types.code` → OTS `LeaveType.code`.
 * These five codes are everything HR actually uses on Walid's install
 * (confirmed 13 April 2026 against the live catalogue). The rest of the
 * Dolibarr catalogue — the ~30 Greek defaults like 5D1Y, 6D2Y etc. — is
 * intentionally NOT mapped; any holiday row pointing at one of those
 * falls through to the label-based fallback and then to the default
 * leave type, each with a soft warning.
 *
 * Note on `LEAVE_WITHOUT_PE`: Dolibarr's `c_holiday_types.code` column is
 * `varchar(16)`, so `LEAVE_WITHOUT_PERMISSION` is truncated to
 * `LEAVE_WITHOUT_PE` on most installs. Both forms are mapped for safety.
 */
const DOLIBARR_CODE_TO_OTS_CODE: Record<string, string> = {
  LEAVE_SICK: 'SICK',
  LEAVE_PERMISSION: 'PERMITTED',
  LEAVE_ANNUAL: 'ANNUAL',
  LEAVE_FAMILY: 'URGENT',
  LEAVE_WITHOUT_PE: 'UNPERMITTED',
  LEAVE_WITHOUT_PERMISSION: 'UNPERMITTED',
};

/** Fallback label-based map for installs that use non-standard codes
 *  but recognisable labels. Preserved from the 18.6.0 REST path. */
const DOLIBARR_LABEL_TO_OTS_CODE: Record<string, string> = {
  'leave with permission': 'PERMITTED',
  'permitted leave': 'PERMITTED',
  'leave without permission': 'UNPERMITTED',
  'unpermitted leave': 'UNPERMITTED',
  'unpaid leave': 'UNPERMITTED',
  'sick leave': 'SICK',
  sickness: 'SICK',
  'annual leave': 'ANNUAL',
  'paid leave': 'ANNUAL',
  'urgent leave': 'URGENT',
};

function normaliseLabel(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/^\d+\s*[-.)]\s*/, '') // strip leading "01-", "02)", etc.
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveOtsLeaveCode(row: DolibarrHolidayDbRow): string | undefined {
  if (row.type_code) {
    const direct = DOLIBARR_CODE_TO_OTS_CODE[row.type_code.toUpperCase()];
    if (direct) return direct;
  }
  if (row.type_label) {
    const fromLabel = DOLIBARR_LABEL_TO_OTS_CODE[normaliseLabel(row.type_label)];
    if (fromLabel) return fromLabel;
  }
  return undefined;
}

// ============================================================================
// SYNC ENTRY POINT
// ============================================================================

export interface RunLeaveSyncOptions {
  triggeredById: string;
  triggerSource?: 'manual' | 'cron';
}

export async function runDolibarrLeaveSync(
  opts: RunLeaveSyncOptions,
): Promise<LeaveSyncResult> {
  const start = Date.now();

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
    // -- Preload OTS LeaveType catalogue (code → id) for fast lookup --
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

    // -- Fetch holidays from Dolibarr MySQL directly (18.8.0) --
    const fetchStart = Date.now();
    const holidays = await fetchApprovedDolibarrHolidays();
    apiResponseMs = Date.now() - fetchStart;
    rowsRead = holidays.length;

    for (const row of holidays) {
      const dolibarrHolidayIdStr = String(row.rowid);
      try {
        // SQL already filters statut=3, but belt-and-braces.
        if (row.statut !== 3) {
          rowsSkipped++;
          continue;
        }

        // -- Resolve employee by fk_user → employmentId --
        if (!row.fk_user || row.fk_user <= 0) {
          employeesNotFound++;
          softWarnings.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            field: 'fk_user',
            message: 'Holiday has no fk_user',
          });
          continue;
        }
        const employmentId = String(row.fk_user);
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

        // -- Validate dates (mysql2 returns native JS Dates) --
        if (!(row.date_debut instanceof Date) || Number.isNaN(row.date_debut.getTime())) {
          hardErrors.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            message: 'Missing or invalid date_debut',
          });
          continue;
        }
        if (!(row.date_fin instanceof Date) || Number.isNaN(row.date_fin.getTime())) {
          hardErrors.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            message: 'Missing or invalid date_fin',
          });
          continue;
        }
        const startDate = row.date_debut;
        const endDate = row.date_fin;
        if (endDate < startDate) {
          hardErrors.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            message: 'date_fin before date_debut',
          });
          continue;
        }

        // -- Resolve leave type via code (preferred) or label (fallback) --
        const otsCode = resolveOtsLeaveCode(row);
        let leaveTypeId: string | undefined;
        if (otsCode) leaveTypeId = leaveTypeByCode.get(otsCode);
        if (!leaveTypeId) {
          leaveTypeId = fallbackLeaveTypeId;
          typesNotMapped++;
          softWarnings.push({
            dolibarrHolidayId: dolibarrHolidayIdStr,
            field: 'fk_type',
            message: `Dolibarr code=${row.type_code ?? '(null)'} label=${row.type_label ?? '(null)'} did not map to any OTS LeaveType; used fallback`,
          });
        }

        // -- Compute calendar / working days (exclude Fridays only) --
        const calendarDays =
          Math.floor(
            (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
          ) + 1;
        let workingDays = 0;
        const cur = new Date(startDate);
        while (cur <= endDate) {
          if (cur.getUTCDay() !== 5) workingDays++;
          cur.setUTCDate(cur.getUTCDate() + 1);
        }

        const description =
          typeof row.description === 'string' && row.description.trim() !== ''
            ? row.description.trim().slice(0, 1000)
            : null;

        // -- Upsert by dolibarrHolidayId --
        const existing = await prisma.leaveRequest.findUnique({
          where: { dolibarrHolidayId: row.rowid },
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
              submittedAt: row.date_create instanceof Date ? row.date_create : new Date(),
              source: 'DOLIBARR',
              dolibarrHolidayId: row.rowid,
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

        // -- Attendance dedup counter (visibility only; calculator uses
        //    the leave as source of truth at calc time) --
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
        hardErrors:
          hardErrors.length > 0
            ? (hardErrors as unknown as Prisma.InputJsonValue)
            : undefined,
        softWarnings:
          softWarnings.length > 0
            ? (softWarnings as unknown as Prisma.InputJsonValue)
            : undefined,
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
        hardErrors: [
          { dolibarrHolidayId: 'SYNC', message: msg },
        ] as unknown as Prisma.InputJsonValue,
        softWarnings:
          softWarnings.length > 0
            ? (softWarnings as unknown as Prisma.InputJsonValue)
            : undefined,
        apiResponseMs,
      },
    });
    throw err;
  }
}
