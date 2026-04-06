/**
 * LCR Sheet Headers API
 * GET — Fetch actual column headers + sample data from the LCR Google Sheet
 * Used by the column mapping UI to populate dropdowns with real sheet columns
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const maxDuration = 30;

function indexToLetter(idx: number): string {
  let n = idx + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export const GET = withApiContext(async (_req, _session) => {
  const sheetId = process.env.GOOGLE_SHEET_LCR_ID;
  const keyJson = process.env.GOOGLE_SHEETS_KEY_JSON;

  if (!sheetId || !keyJson) {
    return NextResponse.json(
      { error: 'GOOGLE_SHEET_LCR_ID or GOOGLE_SHEETS_KEY_JSON not configured' },
      { status: 500 }
    );
  }

  try {
    const credentials = JSON.parse(keyJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Extract sheet tab name from range (e.g., "Sheet1!A:AJ" → "Sheet1")
    const range = process.env.GOOGLE_SHEET_LCR_RANGE ?? 'Sheet1!A:AJ';
    const sheetTab = range.includes('!') ? range.split('!')[0] : 'Sheet1';

    const batchResponse = await Promise.race([
      sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: [
          `'${sheetTab}'!A1:ZZ1`,
          `'${sheetTab}'!A2:ZZ2`,
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out after 25000ms')), 25000)
      ),
    ]);

    const valueRanges = batchResponse.data.valueRanges ?? [];
    const headers: string[] = valueRanges[0]?.values?.[0] ?? [];
    const samples: string[] = valueRanges[1]?.values?.[0] ?? [];

    return NextResponse.json({
      headers: headers.map((h, i) => ({
        index: i,
        column: indexToLetter(i),
        name: h || `Column ${indexToLetter(i)}`,
        sample: samples[i] ?? '',
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch LCR sheet headers');
    const msg = error instanceof Error ? error.message : 'Unknown error';

    if (msg.includes('timed out')) {
      return NextResponse.json({ error: 'Google Sheets request timed out. Try again.' }, { status: 504 });
    }
    if (msg.includes('private_key')) {
      return NextResponse.json({ error: 'Google API credentials not configured properly.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to fetch sheet headers', message: msg }, { status: 500 });
  }
});
