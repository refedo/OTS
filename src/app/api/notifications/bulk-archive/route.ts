/**
 * Archive all notifications for the current user (Clear All)
 * POST /api/notifications/bulk-archive
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

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

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isArchived: false,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        isRead: true,
        readAt: new Date(),
      },
    });

    logger.info({ userId, count: result.count }, 'Bulk archived notifications');

    return NextResponse.json({ success: true, count: result.count });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to bulk archive notifications');
    return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
  }
}
