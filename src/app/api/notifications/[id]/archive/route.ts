/**
 * Archive notification
 * PATCH /api/notifications/[id]/archive
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;
    const notification = await NotificationService.archiveNotification(notificationId, userId);

    return NextResponse.json({ notification });
  } catch (error: any) {
    console.error('Error archiving notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to archive notification' },
      { status: 500 }
    );
  }
}
