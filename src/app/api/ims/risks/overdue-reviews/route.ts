import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();

    const risks = await prisma.imsRisk.findMany({
      where: {
        deletedAt: null,
        nextReviewDate: { lt: now },
        status: { notIn: ['CLOSED'] },
      },
      include: {
        owner: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    const result = risks.map(r => ({
      ...r,
      overdueDays: r.nextReviewDate
        ? Math.floor((now.getTime() - r.nextReviewDate.getTime()) / 86_400_000)
        : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch overdue risk reviews');
    return NextResponse.json({ error: 'Failed to fetch overdue reviews' }, { status: 500 });
  }
}
