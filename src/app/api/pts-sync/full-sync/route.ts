/**
 * PTS Sync API - Full sync (Raw Data + Logs)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { ptsSyncService } from '@/lib/services/pts-sync.service';
import { systemEventService } from '@/services/system-events.service';

// Extend timeout for long-running sync operations
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

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

    const startTime = Date.now();
    systemEventService.logIntegration('PTS_SYNC_STARTED', { userId: session.sub });

    let result;
    try {
      result = await ptsSyncService.fullSync(session.sub, options);
    } catch (innerError) {
      systemEventService.logIntegration('PTS_SYNC_FAILED', {
        userId: session.sub,
        error: innerError instanceof Error ? innerError.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      throw innerError;
    }

    systemEventService.logIntegration('PTS_SYNC_COMPLETED', {
      userId: session.sub,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[PTS Sync API] Full sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
