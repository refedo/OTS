import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.productBacklogItem.findMany({
      select: {
        id: true,
        status: true,
        type: true,
        category: true,
        priority: true,
        createdById: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    const total = items.length;
    const completed = items.filter(i => i.status === 'COMPLETED').length;
    const inProgress = items.filter(i => i.status === 'IN_PROGRESS').length;
    const blocked = items.filter(i => i.status === 'BLOCKED').length;
    const planned = items.filter(i => i.status === 'PLANNED').length;
    const approved = items.filter(i => i.status === 'APPROVED').length;
    const underReview = items.filter(i => i.status === 'UNDER_REVIEW').length;
    const idea = items.filter(i => i.status === 'IDEA').length;
    const dropped = items.filter(i => i.status === 'DROPPED').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const contributorMap: Record<string, { id: string; name: string; total: number; completed: number }> = {};
    for (const item of items) {
      const key = item.createdById;
      if (!contributorMap[key]) {
        contributorMap[key] = {
          id: key,
          name: item.createdBy?.name ?? 'Unknown',
          total: 0,
          completed: 0,
        };
      }
      contributorMap[key].total++;
      if (item.status === 'COMPLETED') contributorMap[key].completed++;
    }
    const contributors = Object.values(contributorMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const categoryMap: Record<string, { category: string; total: number; completed: number; inProgress: number }> = {};
    for (const item of items) {
      const cat = item.category;
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, total: 0, completed: 0, inProgress: 0 };
      }
      categoryMap[cat].total++;
      if (item.status === 'COMPLETED') categoryMap[cat].completed++;
      if (item.status === 'IN_PROGRESS') categoryMap[cat].inProgress++;
    }
    const byCategory = Object.values(categoryMap).sort((a, b) => b.total - a.total);

    const typeMap: Record<string, { type: string; total: number; completed: number }> = {};
    for (const item of items) {
      const t = item.type;
      if (!typeMap[t]) typeMap[t] = { type: t, total: 0, completed: 0 };
      typeMap[t].total++;
      if (item.status === 'COMPLETED') typeMap[t].completed++;
    }
    const byType = Object.values(typeMap).sort((a, b) => b.total - a.total);

    const byPriority: Record<string, number> = {};
    for (const item of items) {
      byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;
    }

    return NextResponse.json({
      kpis: { total, completed, inProgress, blocked, planned, approved, underReview, idea, dropped, completionRate },
      contributors,
      byCategory,
      byType,
      byPriority,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch backlog dashboard stats');
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
