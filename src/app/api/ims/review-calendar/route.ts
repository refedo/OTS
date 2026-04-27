import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthsParam = searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 6;
    const lookAheadMonths = isNaN(months) || months < 1 ? 6 : months;

    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setMonth(windowEnd.getMonth() + lookAheadMonths);

    const documents = await prisma.imsDocument.findMany({
      where: {
        deletedAt: null,
        nextReviewDate: { not: null, lte: windowEnd },
      },
      select: {
        id: true,
        documentNumber: true,
        title: true,
        status: true,
        nextReviewDate: true,
        lastReviewDate: true,
        reviewFrequencyDays: true,
        category: { select: { id: true, code: true, name: true } },
        owner: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: { nextReviewDate: 'asc' },
    });

    const now2 = new Date();
    // Group by month key "YYYY-MM"
    const groupMap = new Map<string, typeof documents>();

    for (const doc of documents) {
      if (!doc.nextReviewDate) continue;
      const d = doc.nextReviewDate;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groupMap.has(monthKey)) {
        groupMap.set(monthKey, []);
      }
      groupMap.get(monthKey)!.push(doc);
    }

    type DocRow = (typeof documents)[number];

    const result = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, docs]) => ({
        month,
        documents: docs.map((doc: DocRow) => {
          let overdueDays: number | null = null;
          if (doc.nextReviewDate && doc.nextReviewDate < now2 && doc.status === 'APPROVED') {
            overdueDays = Math.floor(
              (now2.getTime() - doc.nextReviewDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          }
          return { ...doc, overdueDays };
        }),
      }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS review calendar');
    return NextResponse.json({ error: 'Failed to fetch review calendar' }, { status: 500 });
  }
}
