/**
 * System Events Stats API
 * GET - Get event statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import { eventService } from '@/lib/services/event.service';

export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ots_session';
    const token = request.cookies.get(cookieName)?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;

    const stats = await eventService.getEventStats(projectId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Events Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event stats' },
      { status: 500 }
    );
  }
}
