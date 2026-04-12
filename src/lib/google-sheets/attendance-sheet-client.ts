/**
 * Attendance Sheet Client
 *
 * Thin wrapper around the Google Sheets v4 API using the same
 * `GOOGLE_SERVICE_ACCOUNT_KEY` env var as the PTS sync. Exposes a single
 * `readRange()` helper so the attendance service can ask for raw cell
 * values without knowing anything about googleapis.
 *
 * Phase 2 of OTS-MSS-HR-PAYROLL-v1.
 */

import { google, sheets_v4 } from 'googleapis';
import { logger } from '@/lib/logger';

// Same spreadsheet as PTS — Hexa's canonical workbook. Hardcoded to match
// the PTS sync convention (see src/lib/services/pts-sync.service.ts:13).
export const ATTENDANCE_SPREADSHEET_ID = '11jXnWje2-4n9FPUB1jsJrkP6ioooKgnoYVkwVGG4hPI';
export const ATTENDANCE_TAB_NAME = 'Overtime';

let cachedClient: sheets_v4.Sheets | null = null;

async function getClient(): Promise<sheets_v4.Sheets> {
  if (cachedClient) return cachedClient;

  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY env var is not configured');
  }

  const serviceAccount = JSON.parse(credentials);
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  cachedClient = google.sheets({ version: 'v4', auth });
  return cachedClient;
}

/**
 * Read a range of raw cell values from the attendance sheet.
 * Returns a 2D string array — rows of columns. Empty cells become ''.
 */
export async function readAttendanceRange(range: string): Promise<string[][]> {
  const sheets = await getClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: ATTENDANCE_SPREADSHEET_ID,
    range,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });

  const rows = response.data.values ?? [];
  return rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? '' : String(cell))),
  );
}

/**
 * Read the entire attendance tab in one go. The Overtime tab is wide (many
 * employee columns) and long (years of daily rows) but still small enough
 * to fit in a single Sheets API call comfortably.
 */
export async function readAttendanceTab(): Promise<string[][]> {
  const range = `${ATTENDANCE_TAB_NAME}!A1:ZZ10000`;
  logger.debug({ range }, '[AttendanceSheet] Fetching full tab');
  return readAttendanceRange(range);
}
