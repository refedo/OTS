/**
 * Governance API - Statistics
 *
 * Dashboard statistics for governance data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalAuditLogs,
      todayAuditLogs,
      totalVersions,
      deletedProjects,
      deletedBuildings,
      deletedParts,
      auditByAction,
      recentActivity,
    ] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { performedAt: { gte: today } } }),
      prisma.entityVersion.count(),
      prisma.project.count({ where: { deletedAt: { not: null } } }),
      prisma.building.count({ where: { deletedAt: { not: null } } }),
      prisma.assemblyPart.count({ where: { deletedAt: { not: null } } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: { performedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { performedAt: 'desc' },
        include: { performedBy: { select: { id: true, name: true } } },
      }),
    ]);

    // Resolve entity names for Task entries in recent activity
    const taskIds = recentActivity
      .filter(l => l.entityType === 'Task' && l.entityId !== 'BATCH')
      .map(l => l.entityId);

    const taskMap = new Map<string, { title: string; project: { projectNumber: string; name: string } | null }>();
    if (taskIds.length > 0) {
      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, title: true, project: { select: { projectNumber: true, name: true } } },
      });
      tasks.forEach(t => taskMap.set(t.id, { title: t.title, project: t.project }));
    }

    return NextResponse.json({
      auditLogs: {
        total: totalAuditLogs,
        today: todayAuditLogs,
        byAction: auditByAction.reduce((acc, item) => {
          acc[item.action] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
      versions: { total: totalVersions },
      deleted: {
        projects: deletedProjects,
        buildings: deletedBuildings,
        assemblyParts: deletedParts,
        total: deletedProjects + deletedBuildings + deletedParts,
      },
      recentActivity: recentActivity.map(log => {
        const taskInfo = log.entityType === 'Task' ? taskMap.get(log.entityId) : undefined;
        return {
          id: log.id,
          entityType: log.entityType,
          entityId: log.entityId,
          entityName: taskInfo?.title ?? null,
          entityProject: taskInfo?.project ?? null,
          action: log.action,
          performedBy: log.performedBy,
          performedAt: log.performedAt,
          reason: log.reason,
          sourceModule: log.sourceModule,
        };
      }),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch governance stats');
    return NextResponse.json({ error: 'Failed to fetch governance stats' }, { status: 500 });
  }
}
