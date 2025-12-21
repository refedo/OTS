/**
 * PTS Sync API - Test Google Sheets Connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { googleSheetsSyncService } from '@/lib/services/google-sheets-sync.service';

// POST - Test connection to a Google Sheet
export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { spreadsheetId } = body;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Missing spreadsheetId' },
        { status: 400 }
      );
    }

    const result = await googleSheetsSyncService.testConnection(spreadsheetId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PTS Sync API] Test connection error:', error);
    return NextResponse.json(
      { error: 'Failed to test connection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
