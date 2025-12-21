/**
 * PTS Sync API - Rollback sync for a project
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

    const body = await request.json();
    const { projectNumber } = body;

    if (!projectNumber) {
      return NextResponse.json({ error: 'Project number is required' }, { status: 400 });
    }

    const result = await ptsSyncService.rollbackProject(projectNumber);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[PTS Sync API] Rollback error:', error);
    return NextResponse.json(
      { error: 'Failed to rollback', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
