/**
 * PTS Sync API - Full sync (Raw Data + Logs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { ptsSyncService } from '@/lib/services/pts-sync.service';

export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    
    const options = {
      autoCreateBuildings: body.autoCreateBuildings !== false,
      selectedProjects: body.selectedProjects as string[] | undefined,
      selectedBuildings: body.selectedBuildings as string[] | undefined,
      syncRawData: body.syncRawData !== false,
      syncLogs: body.syncLogs !== false,
      // Date filter for logs
      syncByDate: body.syncByDate === true,
      syncDateFrom: body.syncDateFrom as string | undefined,
      syncDateTo: body.syncDateTo as string | undefined,
    };

    const result = await ptsSyncService.fullSync(session.sub, options);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[PTS Sync API] Full sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
