/**
 * Google Sheet → OTS Attendance Sync Service
 *
 * Phase 2 of OTS-MSS-HR-PAYROLL-v1. One-way mirror from the "Overtime" tab
 * of the Hexa attendance workbook into OTS `AttendanceRecord`. Triggered
 * manually via the sync UI; idempotent.
 *
 * Sheet layout (per Walid, 2026-04-12):
 *   - Rows 1-11: reporting / designation header block (ignored by sync)
 *   - Row 12+  : one row per date
 *   - Col A    : date (e.g. "Sat-01-11-25")
 *   - Col B    : month (e.g. "11-2025")
 *   - Col C/D  : daily totals (ignored — we re-compute)
 *   - From col E onwards:
 *       * Employees — 2 columns each, labeled A/P (Absence/Presence)
 *       * Manpower slots — 1 column each (no overtime entitlement)
 *   - Header row above each employee/slot pair contains:
 *       "<employmentId>-<Name>" for employees
 *       "<slotCode>" or "<slotCode>-<name>" for manpower slots
 *
 * Cell semantics:
 *   - Numeric value → hours worked that slot/day
 *   - "AP"  → ABSENT_WITH_PERMISSION
 *   - "ANP" → ABSENT_NO_PERMISSION
 *   - "AV"  → ANNUAL_VACATION
 *   - "SL"  → SICK_LEAVE
 *   - Empty / 0 on a Friday → WEEKEND
 *   - Empty / 0 on any other day → UNKNOWN (soft warning)
 *
 * For employees the two cells (A, P) are combined into a single record:
 *   - P cell holds regular hours worked
 *   - A cell holds overtime hours (OT is logged on top of regular)
 *   - If either cell is an absence code, the row is an absence and hours = 0
 *   - Friday with any positive hours → isFriday=true, otMultiplier=1.5
 *
 * For manpower slots the single cell holds hours worked. Agency workers
 * are not entitled to OT as a multiplier — they have their own hourlyRate
 * on `ManpowerSlot`, applied later in Phase 3 payroll.
 */

import { createHash } from 'crypto';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import {
  ATTENDANCE_SPREADSHEET_ID,
  ATTENDANCE_TAB_NAME,
  readAttendanceTab,
} from '@/lib/google-sheets/attendance-sheet-client';

// ============================================================================
// CONSTANTS
// ============================================================================

const HEADER_ID_NAME_ROW_INDEX = 9; // 0-based — "25-Mustafa Ibrahim" style row
const DATA_START_ROW_INDEX = 11;   // 0-based — first daily row (row 12 in sheet)
const DATE_COL_INDEX = 0;          // col A
const MONTH_COL_INDEX = 1;         // col B
const FIRST_WORKER_COL_INDEX = 4;  // col E

// Absence codes the sheet uses. Case-insensitive match on trim.
const ABSENCE_CODES = new Map<string, AttendanceStatusLiteral>([
  ['AP', 'ABSENT_WITH_PERMISSION'],
  ['ANP', 'ABSENT_NO_PERMISSION'],
  ['AV', 'ANNUAL_VACATION'],
  ['SL', 'SICK_LEAVE'],
]);

// ============================================================================
// TYPES
// ============================================================================

type AttendanceStatusLiteral =
  | 'PRESENT'
  | 'ABSENT_WITH_PERMISSION'
  | 'ABSENT_NO_PERMISSION'
  | 'ANNUAL_VACATION'
  | 'SICK_LEAVE'
  | 'WEEKEND'
  | 'PUBLIC_HOLIDAY'
  | 'UNKNOWN';

type WorkerTypeLiteral = 'EMPLOYEE' | 'MANPOWER_SLOT';

interface WorkerColumn {
  workerType: WorkerTypeLiteral;
  employeeId: string | null;       // OTS Employee.id if resolved
  manpowerSlotId: string | null;   // OTS ManpowerSlot.id if resolved
  identifier: string;               // raw identifier from header ("25", "SH-W01", etc.)
  displayName: string;              // raw header text
  colIndexA: number;                // column index of the "A" cell (or the only cell for slots)
  colIndexP: number | null;         // column index of the "P" cell (null for manpower slots)
  orphan: boolean;                  // true if identifier did not resolve
}

type HardError = { row: number; column?: number; message: string };
type SoftWarning = { row: number; column?: number; message: string };
type Orphan = { identifier: string; displayName: string; headerColumnIndex: number };

export interface AttendanceSyncResult {
  syncLogId: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  employeeOrphans: Orphan[];
  slotOrphans: Orphan[];
  hardErrors: HardError[];
  softWarnings: SoftWarning[];
  durationMs: number;
}

export interface RunAttendanceSyncOptions {
  triggeredById: string;
}

// ============================================================================
// HEADER PARSING
// ============================================================================

/**
 * Parse the employee/slot header row at `HEADER_ID_NAME_ROW_INDEX`.
 *
 * Strategy:
 *   - Walk columns left-to-right starting at FIRST_WORKER_COL_INDEX.
 *   - A cell matching ^\d+-.+ is an employee header (ID-Name). Its 2 columns
 *     are (A, P) — the next column belongs to the same employee.
 *   - A cell matching ^[A-Z]+-?\w+ (non-numeric prefix) is a manpower slot.
 *     It occupies 1 column only.
 *   - Empty cells are skipped (separator padding).
 *
 * This is heuristic-friendly: if the actual layout differs, the probe
 * endpoint (/api/hr/attendance/sync/probe) dumps the raw rows so we can
 * tune the rules without a migration.
 */
async function parseWorkerColumns(headerRow: string[]): Promise<WorkerColumn[]> {
  const columns: WorkerColumn[] = [];

  // Resolve maps for FK lookups — one DB round-trip each.
  const [employees, slots] = await Promise.all([
    prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, employmentId: true, fullNameEn: true },
    }),
    prisma.manpowerSlot.findMany({
      where: { deletedAt: null },
      select: { id: true, slotCode: true, trade: true },
    }),
  ]);
  const employeeByEmploymentId = new Map(employees.map((e) => [e.employmentId, e]));
  const slotBySlotCode = new Map(slots.map((s) => [s.slotCode.toUpperCase(), s]));

  let col = FIRST_WORKER_COL_INDEX;
  while (col < headerRow.length) {
    const raw = (headerRow[col] ?? '').trim();
    if (!raw) {
      col += 1;
      continue;
    }

    const employeeMatch = /^(\d+)\s*[-–—]\s*(.+)$/.exec(raw);
    if (employeeMatch) {
      const employmentId = employeeMatch[1];
      const displayName = raw;
      const resolved = employeeByEmploymentId.get(employmentId);
      columns.push({
        workerType: 'EMPLOYEE',
        employeeId: resolved?.id ?? null,
        manpowerSlotId: null,
        identifier: employmentId,
        displayName,
        colIndexA: col,
        colIndexP: col + 1,
        orphan: !resolved,
      });
      col += 2;
      continue;
    }

    // Manpower slot — 1 column. Accept "SH-W01", "SH-W01 Mohammed", or just "SH-W01".
    const slotMatch = /^([A-Z]{1,6}[-_]?[A-Z0-9]+[A-Z0-9\-_]*)/i.exec(raw);
    if (slotMatch) {
      const slotCode = slotMatch[1].toUpperCase();
      const resolved = slotBySlotCode.get(slotCode);
      columns.push({
        workerType: 'MANPOWER_SLOT',
        employeeId: null,
        manpowerSlotId: resolved?.id ?? null,
        identifier: slotCode,
        displayName: raw,
        colIndexA: col,
        colIndexP: null,
        orphan: !resolved,
      });
      col += 1;
      continue;
    }

    // Unrecognised header — advance one column and skip.
    col += 1;
  }

  return columns;
}

// ============================================================================
// DATE + CELL PARSING
// ============================================================================

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a date cell from column A. Accepts:
 *   - "Sat-01-11-25"  (Day-DD-MM-YY)
 *   - "01/11/2025", "2025-11-01"  (fallback)
 *   - Google Sheets serial number (number type)
 */
function parseDateCell(cell: string): Date | null {
  if (!cell) return null;
  const s = cell.trim();

  // Day-DD-MM-YY
  const m1 = /^([A-Za-z]{3})[-\s](\d{1,2})[-\s](\d{1,2})[-\s](\d{2,4})$/.exec(s);
  if (m1) {
    const dd = Number(m1[2]);
    const mm = Number(m1[3]);
    let yy = Number(m1[4]);
    if (yy < 100) yy = 2000 + yy;
    const d = new Date(Date.UTC(yy, mm - 1, dd));
    if (!Number.isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const m2 = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m2) {
    const d = new Date(Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3])));
    if (!Number.isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY
  const m3 = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m3) {
    let yy = Number(m3[3]);
    if (yy < 100) yy = 2000 + yy;
    const d = new Date(Date.UTC(yy, Number(m3[2]) - 1, Number(m3[1])));
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

interface ParsedCell {
  isNumeric: boolean;
  hours: number;
  code: AttendanceStatusLiteral | null;
}

function parseCellValue(cell: string): ParsedCell {
  const trimmed = (cell ?? '').trim();
  if (!trimmed) return { isNumeric: false, hours: 0, code: null };

  const asNumber = Number(trimmed.replace(',', '.'));
  if (!Number.isNaN(asNumber)) {
    return { isNumeric: true, hours: asNumber, code: null };
  }

  const upper = trimmed.toUpperCase();
  const code = ABSENCE_CODES.get(upper);
  if (code) return { isNumeric: false, hours: 0, code };

  return { isNumeric: false, hours: 0, code: null };
}

function isFriday(date: Date): boolean {
  return date.getUTCDay() === 5;
}

function rowHash(parts: Array<string | number | null>): string {
  return createHash('sha256').update(parts.map((p) => String(p ?? '')).join('|')).digest('hex');
}

// ============================================================================
// SYNC ENTRY POINT
// ============================================================================

export async function runAttendanceSync(
  opts: RunAttendanceSyncOptions,
): Promise<AttendanceSyncResult> {
  const start = Date.now();
  const hardErrors: HardError[] = [];
  const softWarnings: SoftWarning[] = [];

  // Open a sync log row in RUNNING state so partial failures are visible.
  const syncLog = await prisma.googleSheetAttendanceSyncLog.create({
    data: {
      status: 'RUNNING',
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      tabName: ATTENDANCE_TAB_NAME,
      triggeredById: opts.triggeredById,
    },
  });

  try {
    const rows = await readAttendanceTab();
    logger.info({ rowCount: rows.length }, '[Attendance Sync] Sheet fetched');

    if (rows.length <= DATA_START_ROW_INDEX) {
      throw new Error(
        `Sheet has only ${rows.length} rows; expected at least ${DATA_START_ROW_INDEX + 1}`,
      );
    }

    const headerRow = rows[HEADER_ID_NAME_ROW_INDEX] ?? [];
    const workerColumns = await parseWorkerColumns(headerRow);

    const employeeOrphans: Orphan[] = workerColumns
      .filter((w) => w.workerType === 'EMPLOYEE' && w.orphan)
      .map((w) => ({
        identifier: w.identifier,
        displayName: w.displayName,
        headerColumnIndex: w.colIndexA,
      }));

    const slotOrphans: Orphan[] = workerColumns
      .filter((w) => w.workerType === 'MANPOWER_SLOT' && w.orphan)
      .map((w) => ({
        identifier: w.identifier,
        displayName: w.displayName,
        headerColumnIndex: w.colIndexA,
      }));

    const resolvedColumns = workerColumns.filter((w) => !w.orphan);

    // Load public holidays once and index by ISO date (YYYY-MM-DD).
    const holidays = await prisma.publicHoliday.findMany({
      where: { deletedAt: null },
      select: { date: true },
    });
    const holidaySet = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));

    let rowsRead = 0;
    let rowsCreated = 0;
    let rowsUpdated = 0;
    let rowsUnchanged = 0;

    const lastImportedAt = new Date();

    for (let r = DATA_START_ROW_INDEX; r < rows.length; r++) {
      const row = rows[r] ?? [];
      if (row.length === 0) continue;

      const dateCell = row[DATE_COL_INDEX] ?? '';
      const date = parseDateCell(dateCell);
      if (!date) {
        // Empty or totals row; skip silently unless col contains data.
        if (dateCell.trim()) {
          softWarnings.push({ row: r + 1, column: DATE_COL_INDEX + 1, message: `Unparseable date: "${dateCell}"` });
        }
        continue;
      }
      rowsRead += 1;

      const isoDate = date.toISOString().slice(0, 10);
      const dayIsFriday = isFriday(date);
      const dayIsHoliday = holidaySet.has(isoDate);

      for (const worker of resolvedColumns) {
        const rawA = (row[worker.colIndexA] ?? '').toString();
        const rawP = worker.colIndexP !== null ? (row[worker.colIndexP] ?? '').toString() : '';

        const parsedA = parseCellValue(rawA);
        const parsedP = worker.colIndexP !== null ? parseCellValue(rawP) : { isNumeric: false, hours: 0, code: null };

        // Determine status + hours.
        let status: AttendanceStatusLiteral = 'UNKNOWN';
        let regularHours = 0;
        let overtimeHours = 0;
        let otMultiplier = 1.0;

        // Any absence code in either cell wins.
        const absenceCode = parsedA.code ?? parsedP.code ?? null;
        if (absenceCode) {
          status = absenceCode;
        } else if (worker.workerType === 'EMPLOYEE') {
          // Two-cell employee: P = regular hours, A = overtime hours.
          regularHours = parsedP.isNumeric ? Math.max(0, parsedP.hours) : 0;
          overtimeHours = parsedA.isNumeric ? Math.max(0, parsedA.hours) : 0;
          if (regularHours + overtimeHours > 0) {
            status = 'PRESENT';
            if (dayIsFriday) otMultiplier = 1.5;
          } else if (dayIsHoliday) {
            status = 'PUBLIC_HOLIDAY';
          } else if (dayIsFriday) {
            status = 'WEEKEND';
          } else {
            status = 'UNKNOWN';
            softWarnings.push({
              row: r + 1,
              column: worker.colIndexA + 1,
              message: `Empty cells for employee ${worker.identifier} on non-Friday ${isoDate}`,
            });
          }
        } else {
          // Manpower slot: single cell, regular hours only.
          regularHours = parsedA.isNumeric ? Math.max(0, parsedA.hours) : 0;
          if (regularHours > 0) {
            status = 'PRESENT';
          } else if (dayIsHoliday) {
            status = 'PUBLIC_HOLIDAY';
          } else if (dayIsFriday) {
            status = 'WEEKEND';
          } else {
            status = 'UNKNOWN';
          }
        }

        const hash = rowHash([worker.identifier, isoDate, rawA, rawP, status, regularHours, overtimeHours]);

        const whereClause: Prisma.AttendanceRecordWhereInput = {
          workerType: worker.workerType,
          date,
          ...(worker.workerType === 'EMPLOYEE'
            ? { employeeId: worker.employeeId! }
            : { manpowerSlotId: worker.manpowerSlotId! }),
        };

        const existing = await prisma.attendanceRecord.findFirst({ where: whereClause });

        if (existing) {
          if (existing.sourceRowHash === hash) {
            rowsUnchanged += 1;
            continue;
          }
          await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: {
              status,
              regularHours,
              overtimeHours,
              otMultiplier,
              isFriday: dayIsFriday,
              isPublicHoliday: dayIsHoliday,
              rawCellA: rawA || null,
              rawCellP: rawP || null,
              sourceRowHash: hash,
              lastImportBatchId: syncLog.id,
              lastImportedAt,
            },
          });
          rowsUpdated += 1;
        } else {
          await prisma.attendanceRecord.create({
            data: {
              workerType: worker.workerType,
              employeeId: worker.employeeId,
              manpowerSlotId: worker.manpowerSlotId,
              date,
              status,
              regularHours,
              overtimeHours,
              otMultiplier,
              isFriday: dayIsFriday,
              isPublicHoliday: dayIsHoliday,
              rawCellA: rawA || null,
              rawCellP: rawP || null,
              sourceRowHash: hash,
              lastImportBatchId: syncLog.id,
              lastImportedAt,
            },
          });
          rowsCreated += 1;
        }
      }
    }

    const durationMs = Date.now() - start;
    const finalStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' =
      hardErrors.length > 0
        ? 'PARTIAL'
        : employeeOrphans.length + slotOrphans.length > 0
        ? 'PARTIAL'
        : 'SUCCESS';

    await prisma.googleSheetAttendanceSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: finalStatus,
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsUnchanged,
        employeeOrphans: employeeOrphans as unknown as Prisma.InputJsonValue,
        slotOrphans: slotOrphans as unknown as Prisma.InputJsonValue,
        hardErrors: hardErrors as unknown as Prisma.InputJsonValue,
        softWarnings: softWarnings as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
        durationMs,
      },
    });

    logger.info(
      {
        syncLogId: syncLog.id,
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsUnchanged,
        orphans: employeeOrphans.length + slotOrphans.length,
        durationMs,
      },
      '[Attendance Sync] Completed',
    );

    return {
      syncLogId: syncLog.id,
      status: finalStatus,
      rowsRead,
      rowsCreated,
      rowsUpdated,
      rowsUnchanged,
      employeeOrphans,
      slotOrphans,
      hardErrors,
      softWarnings,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ error, syncLogId: syncLog.id }, '[Attendance Sync] Failed');

    await prisma.googleSheetAttendanceSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'FAILED',
        hardErrors: [{ row: 0, message }] as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
        durationMs,
      },
    });

    return {
      syncLogId: syncLog.id,
      status: 'FAILED',
      rowsRead: 0,
      rowsCreated: 0,
      rowsUpdated: 0,
      rowsUnchanged: 0,
      employeeOrphans: [],
      slotOrphans: [],
      hardErrors: [{ row: 0, message }],
      softWarnings: [],
      durationMs,
    };
  }
}
