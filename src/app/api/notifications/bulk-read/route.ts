/**
 * Mark all notifications as read
 * POST /api/notifications/bulk-read
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import NotificationService from '@/lib/services/notification.service';

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const session = verifySession(token);
    return session?.sub || null;
  }

  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const token = request.cookies.get(cookieName)?.value;
  if (token) {
    const session = verifySession(token);
    return session?.sub || null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await NotificationService.markAllAsRead(userId);

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
