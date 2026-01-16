/**
 * Notifications API Routes
 * GET /api/notifications - List user's notifications with filters
 * POST /api/notifications/bulk-read - Mark all as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/jwt';
import NotificationService from '@/lib/services/notification.service';

// Helper to get userId from request
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // Try Bearer token first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const session = verifySession(token);
    return session?.sub || null;
  }

  // Try cookie
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const token = request.cookies.get(cookieName)?.value;
  if (token) {
    const session = verifySession(token);
    return session?.sub || null;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const isReadParam = searchParams.get('isRead');
    const isArchivedParam = searchParams.get('isArchived');
    const type = searchParams.get('type') as any;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filters
    const filters: any = {
      userId,
      limit,
      offset,
    };

    if (isReadParam !== null) {
      filters.isRead = isReadParam === 'true';
    }

    if (isArchivedParam !== null) {
      filters.isArchived = isArchivedParam === 'true';
    }

    if (type) {
      filters.type = type;
    }

    // Fetch notifications
    const notifications = await NotificationService.getNotifications(filters);
    const unreadCount = await NotificationService.getUnreadCount(userId);

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
