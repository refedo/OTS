/**
 * PTS Sync API - Validate sync (compare PTS with OTS)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { ptsSyncService } from '@/lib/services/pts-sync.service';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const validation = await ptsSyncService.validateSync();
    return NextResponse.json(validation);
  } catch (error) {
    console.error('[PTS Sync API] Validate error:', error);
    return NextResponse.json(
      { error: 'Failed to validate sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
