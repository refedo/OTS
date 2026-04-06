/**
 * PTS Sync Columns API
 * GET - Fetch column headers from PTS Google Sheet for field mapping
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { google } from 'googleapis';

// Set max duration for serverless function (Vercel/Netlify)
export const maxDuration = 30; // 30 seconds

// Timeout wrapper for API calls
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

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

    // Single batchGet request for all 4 ranges (headers + sample rows for both sheets)
    const TIMEOUT_MS = 25000;
    const batchResponse = await withTimeout(
      sheets.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [
          `'${RAW_DATA_SHEET}'!A1:ZZ1`,
          `'${LOG_SHEET}'!A1:ZZ1`,
          `'${RAW_DATA_SHEET}'!A2:ZZ2`,
          `'${LOG_SHEET}'!A2:ZZ2`,
        ],
      }),
      TIMEOUT_MS
    );

    const valueRanges = batchResponse.data.valueRanges ?? [];
    const rawDataHeaders: string[] = valueRanges[0]?.values?.[0] ?? [];
    const logHeaders: string[] = valueRanges[1]?.values?.[0] ?? [];
    const rawDataSample: string[] = valueRanges[2]?.values?.[0] ?? [];
    const logSample: string[] = valueRanges[3]?.values?.[0] ?? [];

    return NextResponse.json({
      rawData: {
        headers: rawDataHeaders.map((h, i) => ({
          index: i,
          column: String.fromCharCode(65 + i),
          name: h || `Column ${String.fromCharCode(65 + i)}`,
          sample: rawDataSample[i] || '',
        })),
      },
      logs: {
        headers: logHeaders.map((h, i) => ({
          index: i,
          column: String.fromCharCode(65 + i),
          name: h || `Column ${String.fromCharCode(65 + i)}`,
          sample: logSample[i] || '',
        })),
      },
    });
  } catch (error) {
    logger.error({ error }, 'PTS Columns API error');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('private_key')) {
      return NextResponse.json(
        { error: 'Google API credentials not configured properly.' },
        { status: 500 }
      );
    }

    if (errorMessage.includes('timed out')) {
      return NextResponse.json(
        { error: 'Google Sheets API request timed out. Please try again.', message: errorMessage },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch columns', message: errorMessage },
      { status: 500 }
    );
  }
}
