import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

/**
 * POST /api/announcements/[id]/dismiss
 * Records that the current user dismissed a banner announcement.
 * Idempotent — safe to call multiple times.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  try {
    const existing = await prisma.announcement.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    await prisma.announcementDismissal.upsert({
      where: {
        announcementId_userId: {
          announcementId: id,
          userId: session.sub,
        },
      },
      create: {
        id: crypto.randomUUID(),
        announcementId: id,
        userId: session.sub,
      },
      update: { dismissedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to dismiss announcement');
    return NextResponse.json({ error: 'Failed to dismiss announcement' }, { status: 500 });
  }
}
