/**
 * PTS Sync Columns API
 * GET - Fetch column headers from PTS Google Sheet for field mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { google } from 'googleapis';

const SPREADSHEET_ID = '11jXnWje2-4n9FPUB1jsJrkP6ioooKgnoYVkwVGG4hPI';
const RAW_DATA_SHEET = '02-Raw Data';
const LOG_SHEET = '04-Log';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Google Sheets API using the same approach as pts-sync.service.ts
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
      return NextResponse.json(
        { error: 'GOOGLE_SERVICE_ACCOUNT_KEY not configured' },
        { status: 500 }
      );
    }

    const credentials = JSON.parse(keyJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch headers from both sheets
    const [rawDataResponse, logResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${RAW_DATA_SHEET}'!A1:Z1`,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${LOG_SHEET}'!A1:Z1`,
      }),
    ]);

    const rawDataHeaders = rawDataResponse.data.values?.[0] || [];
    const logHeaders = logResponse.data.values?.[0] || [];

    // Also fetch a sample row to show data preview
    const [rawDataSample, logSample] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${RAW_DATA_SHEET}'!A2:Z2`,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${LOG_SHEET}'!A2:Z2`,
      }),
    ]);

    return NextResponse.json({
      rawData: {
        headers: rawDataHeaders.map((h: string, i: number) => ({
          index: i,
          column: String.fromCharCode(65 + i), // A, B, C, etc.
          name: h || `Column ${String.fromCharCode(65 + i)}`,
          sample: rawDataSample.data.values?.[0]?.[i] || '',
        })),
      },
      logs: {
        headers: logHeaders.map((h: string, i: number) => ({
          index: i,
          column: String.fromCharCode(65 + i),
          name: h || `Column ${String.fromCharCode(65 + i)}`,
          sample: logSample.data.values?.[0]?.[i] || '',
        })),
      },
    });
  } catch (error) {
    console.error('[PTS Columns API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[PTS Columns API] Stack:', errorStack);
    
    // Check for common issues
    if (errorMessage.includes('private_key')) {
      return NextResponse.json(
        { error: 'Google API credentials not configured properly. Check GOOGLE_PRIVATE_KEY environment variable.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch columns', message: errorMessage },
      { status: 500 }
    );
  }
}
