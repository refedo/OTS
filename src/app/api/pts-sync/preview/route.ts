/**
 * PTS Sync API - Preview Sheet Data
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { googleSheetsSyncService, DEFAULT_COLUMN_MAPPING } from '@/lib/services/google-sheets-sync.service';
import { google } from 'googleapis';

const SPREADSHEET_ID = '11jXnWje2-4n9FPUB1jsJrkP6ioooKgnoYVkwVGG4hPI';
const RAW_DATA_SHEET = '02-Raw Data';
const LOG_SHEET = '04-Log';

// POST - Preview data from a Google Sheet
export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      spreadsheetId,
      sheetName,
      columnMapping = DEFAULT_COLUMN_MAPPING,
      dataStartRow = 2,
      limit = 20,
      useDefault = false,
      sheet = 'rawData', // 'rawData' or 'logs'
    } = body;

    // If useDefault mode, read directly from the PTS spreadsheet using column mapping
    if (useDefault || (!spreadsheetId && !sheetName)) {
      const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!keyJson) {
        return NextResponse.json({ error: 'Google service account not configured' }, { status: 500 });
      }
      const credentials = JSON.parse(keyJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      const sheets = google.sheets({ version: 'v4', auth });

      const targetSheet = sheet === 'logs' ? LOG_SHEET : RAW_DATA_SHEET;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${targetSheet}'!A1:T${limit + 1}`,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        return NextResponse.json({ data: [], count: 0 });
      }

      // First row is headers
      const headers = rows[0];
      const dataRows = rows.slice(1, limit + 1);

      // Map using column mapping if provided
      const mappedData = dataRows.map(row => {
        const mapped: Record<string, string> = {};
        if (columnMapping && typeof columnMapping === 'object') {
          for (const [field, col] of Object.entries(columnMapping)) {
            const colStr = col as string;
            // Convert column letter to index (A=0, B=1, etc.)
            const colIndex = colStr.charCodeAt(0) - 65 + (colStr.length > 1 ? (colStr.charCodeAt(1) - 65 + 1) * 26 : 0);
            mapped[field] = row[colIndex] || '';
          }
        } else {
          // No mapping, use headers
          headers.forEach((h: string, i: number) => {
            mapped[h || `Col${i}`] = row[i] || '';
          });
        }
        return mapped;
      });

      return NextResponse.json({ data: mappedData, count: mappedData.length });
    }

    if (!spreadsheetId || !sheetName) {
      return NextResponse.json(
        { error: 'Missing spreadsheetId or sheetName' },
        { status: 400 }
      );
    }

    const data = await googleSheetsSyncService.previewData(
      spreadsheetId,
      sheetName,
      columnMapping,
      dataStartRow,
      limit
    );

    return NextResponse.json({ data, count: data.length });
  } catch (error) {
    console.error('[PTS Sync API] Preview error:', error);
    return NextResponse.json(
      { error: 'Failed to preview data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
