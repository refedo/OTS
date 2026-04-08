import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { ptsSyncService } from '@/lib/services/pts-sync.service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { buildingId } = body;

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    const result = await ptsSyncService.rollbackBuilding(buildingId);

    logger.info({
      userId: session.sub,
      buildingId,
      ...result,
    }, 'PTS building rollback completed');

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error({ error }, 'PTS building rollback error');
    return NextResponse.json(
      { error: 'Failed to rollback building', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
