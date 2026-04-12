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
    // Rows 1..25 — everything above and just below the data-start at row 15.
    const headerBlock = await readAttendanceRange(`${ATTENDANCE_TAB_NAME}!A1:ZZ25`);
    // Data starts at 0-based index 14 (sheet row 15) — sample the first 5 rows.
    const firstFiveDataRows = headerBlock.slice(14, 19);

    return NextResponse.json({
      spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
      tabName: ATTENDANCE_TAB_NAME,
      rowCount: headerBlock.length,
      maxCols: headerBlock.reduce((m, r) => Math.max(m, r.length), 0),
      headerBlockRows1to25: headerBlock,
      firstFiveDataRowsAssumedFrom15: firstFiveDataRows,
      notes: [
        'Rows 1-11: reporting / role / category header block',
        'Row 12: worker name row (e.g. "25-Mustafa Ibrahim", "SH-W1")',
        'Row 13: monthly totals per worker (ignored)',
        'Row 14: "Date / Month / Total / …" column labels (ignored)',
        'Row 15+: daily data',
        'Col A: date · Col B: month label · Col C-P: daily breakdowns (ignored)',
        'Col Q+: worker cells — employees 2 cols (A/P + O.T), slots 1 col',
      ],
    });
  } catch (error) {
    logger.error({ error }, '[Attendance Probe] Failed');
    const msg = error instanceof Error ? error.message : 'Probe failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
