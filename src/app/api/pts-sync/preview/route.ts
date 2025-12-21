/**
 * PTS Sync API - Preview Sheet Data
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { googleSheetsSyncService, DEFAULT_COLUMN_MAPPING } from '@/lib/services/google-sheets-sync.service';

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
      limit = 10,
    } = body;

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
