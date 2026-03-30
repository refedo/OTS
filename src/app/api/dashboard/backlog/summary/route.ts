import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (_req: NextRequest, session) => {
  try {
    const userId = session!.userId;
    const userRole = session!.role;

    // Non-admin users see only backlogs they created or are involved with
    const isAdmin = ['Admin', 'CEO'].includes(userRole);
    const userFilter = isAdmin ? {} : {
      OR: [
        { createdById: userId },
        { approvedById: userId },
        { reviewedById: userId },
        { plannedById: userId },
      ],
    };

    const [byStatus, byPriority, recent] = await Promise.all([
      prisma.productBacklogItem.groupBy({
        by: ['status'],
        where: userFilter,
        _count: { _all: true },
      }),
      prisma.productBacklogItem.groupBy({
        by: ['priority'],
        where: userFilter,
        _count: { _all: true },
      }),
      prisma.productBacklogItem.findMany({
        where: {
          ...userFilter,
          status: { notIn: ['COMPLETED', 'DROPPED'] },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          code: true,
          title: true,
          type: true,
          priority: true,
          status: true,
        },
      }),
    ]);

    const statusMap = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count._all])
    );
    const priorityMap = Object.fromEntries(
      byPriority.map((p) => [p.priority, p._count._all])
    );

    const total = byStatus.reduce((sum, s) => sum + s._count._all, 0);
    const active = (statusMap['IN_PROGRESS'] ?? 0) + (statusMap['PLANNED'] ?? 0) + (statusMap['APPROVED'] ?? 0);
    const blocked = statusMap['BLOCKED'] ?? 0;
    const critical = priorityMap['CRITICAL'] ?? 0;
    const high = priorityMap['HIGH'] ?? 0;

    return NextResponse.json({
      total,
      active,
      blocked,
      idea: statusMap['IDEA'] ?? 0,
      underReview: statusMap['UNDER_REVIEW'] ?? 0,
      approved: statusMap['APPROVED'] ?? 0,
      planned: statusMap['PLANNED'] ?? 0,
      inProgress: statusMap['IN_PROGRESS'] ?? 0,
      completed: statusMap['COMPLETED'] ?? 0,
      dropped: statusMap['DROPPED'] ?? 0,
      critical,
      high,
      medium: priorityMap['MEDIUM'] ?? 0,
      low: priorityMap['LOW'] ?? 0,
      recent,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch backlog summary');
    return NextResponse.json({ error: 'Failed to fetch backlog summary' }, { status: 500 });
  }
});
