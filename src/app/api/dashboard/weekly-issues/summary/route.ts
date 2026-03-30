import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (_req: NextRequest, session) => {
  try {
    const userId = session!.userId;
    const userRole = session!.role;

    // Non-admin users see only issues assigned to them or raised by them
    const isAdmin = ['Admin', 'CEO'].includes(userRole);
    const userFilter = isAdmin ? {} : {
      OR: [
        { assignedToId: userId },
        { raisedById: userId },
      ],
    };

    const [byStatus, byPriority, recent] = await Promise.all([
      prisma.weeklyIssue.groupBy({
        by: ['status'],
        where: userFilter,
        _count: { _all: true },
      }),
      prisma.weeklyIssue.groupBy({
        by: ['priority'],
        where: userFilter,
        _count: { _all: true },
      }),
      prisma.weeklyIssue.findMany({
        where: {
          ...userFilter,
          status: { notIn: ['Resolved', 'Closed'] },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          issueNumber: true,
          title: true,
          priority: true,
          status: true,
          dueDate: true,
          department: { select: { name: true } },
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
    const open = statusMap['Open'] ?? 0;
    const inProgress = statusMap['In Progress'] ?? 0;
    const resolved = statusMap['Resolved'] ?? 0;
    const closed = statusMap['Closed'] ?? 0;

    const overdue = await prisma.weeklyIssue.count({
      where: {
        ...userFilter,
        status: { notIn: ['Resolved', 'Closed'] },
        dueDate: { lt: new Date() },
      },
    });

    return NextResponse.json({
      total,
      open,
      inProgress,
      resolved,
      closed,
      overdue,
      critical: priorityMap['Critical'] ?? 0,
      high: priorityMap['High'] ?? 0,
      medium: priorityMap['Medium'] ?? 0,
      low: priorityMap['Low'] ?? 0,
      recent,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch weekly issues summary');
    return NextResponse.json({ error: 'Failed to fetch weekly issues summary' }, { status: 500 });
  }
});
