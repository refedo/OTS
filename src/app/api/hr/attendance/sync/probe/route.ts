/**
 * GET /api/hr/attendance/sync/probe
 *
 * Dev/ops helper — dumps the top 20 rows and the first 5 data rows of the
 * Overtime tab exactly as they come off the Google Sheets API. Used to
 * verify the column layout (employee header block, data start row, 2-col
 * vs 1-col per worker) before running the real sync.
 *
 * Gated by `hr.attendance.probe`. Returns raw 2D arrays — no parsing.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import {
  ATTENDANCE_SPREADSHEET_ID,
  ATTENDANCE_TAB_NAME,
  readAttendanceRange,
} from '@/lib/google-sheets/attendance-sheet-client';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canProbe = await checkPermission('hr.attendance.probe');
  if (!canProbe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    // Rows 1..25 — everything above and just below the assumed data-start at row 12.
    const headerBlock = await readAttendanceRange(`${ATTENDANCE_TAB_NAME}!A1:ZZ25`);
    // Totals row usually sits near the very top; sample separately for clarity.
    const firstFiveDataRows = headerBlock.slice(11, 16);

    return NextResponse.json({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      tabName: ATTENDANCE_TAB_NAME,
      rowCount: headerBlock.length,
      maxCols: headerBlock.reduce((m, r) => Math.max(m, r.length), 0),
      headerBlockRows1to25: headerBlock,
      firstFiveDataRowsAssumedFrom12: firstFiveDataRows,
      notes: [
        'Rows 1-11 are reporting/header per Walid',
        'Data expected to start at row 12',
        'Employees: 2 columns each (A/P = Absence/Presence)',
        'Manpower slots: 1 column each (no overtime)',
      ],
    });
  } catch (error) {
    logger.error({ error }, '[Attendance Probe] Failed');
    const msg = error instanceof Error ? error.message : 'Probe failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
