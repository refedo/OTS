import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

/**
 * GET /api/announcements/active
 * Returns currently active announcements for the current user.
 * Filters by: isActive=true, startDate<=now<=endDate, (targetType=ALL OR userId in targets)
 * Includes whether the user has dismissed each banner.
 */
export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();

    const announcements = await prisma.announcement.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [
          { targetType: 'ALL' },
          { targets: { some: { userId: session.sub } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        targets: {
          where: { userId: session.sub },
          select: { userId: true },
        },
        dismissals: {
          where: { userId: session.sub },
          select: { dismissedAt: true },
        },
      },
    });

    const result = announcements.map((ann: (typeof announcements)[0]) => ({
      ...ann,
      isDismissed: ann.dismissals.length > 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch active announcements');
    return NextResponse.json({ error: 'Failed to fetch active announcements' }, { status: 500 });
  }
}
