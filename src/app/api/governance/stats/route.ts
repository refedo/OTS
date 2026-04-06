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
      deletedTasks,
      auditByAction,
      recentActivity,
    ] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { performedAt: { gte: today } } }),
      prisma.entityVersion.count(),
      prisma.project.count({ where: { deletedAt: { not: null } } }),
      prisma.building.count({ where: { deletedAt: { not: null } } }),
      prisma.assemblyPart.count({ where: { deletedAt: { not: null } } }),
      prisma.task.count({ where: { deletedAt: { not: null } } }).catch(() => 0),
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

    // Resolve entity names for Task and Building entries in recent activity
    const taskIds = recentActivity.filter(l => l.entityType === 'Task' && l.entityId !== 'BATCH').map(l => l.entityId);
    const buildingIds = recentActivity.filter(l => l.entityType === 'Building' && l.entityId !== 'BATCH').map(l => l.entityId);

    const [tasksData, buildingsData] = await Promise.all([
      taskIds.length > 0
        ? prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, title: true, project: { select: { projectNumber: true, name: true } } } })
        : Promise.resolve([]),
      buildingIds.length > 0
        ? prisma.building.findMany({ where: { id: { in: buildingIds } }, select: { id: true, name: true, designation: true, project: { select: { projectNumber: true, name: true } } } })
        : Promise.resolve([]),
    ]);

    const metaMap = new Map<string, { name: string; project: { projectNumber: string; name: string } | null }>();
    tasksData.forEach(t => metaMap.set(t.id, { name: t.title, project: t.project }));
    buildingsData.forEach(b => metaMap.set(b.id, { name: b.name || b.designation, project: b.project }));

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
        tasks: deletedTasks,
        total: deletedProjects + deletedBuildings + deletedParts + deletedTasks,
      },
      recentActivity: recentActivity.map(log => {
        const meta = metaMap.get(log.entityId);
        return {
          id: log.id,
          entityType: log.entityType,
          entityId: log.entityId,
          entityName: meta?.name ?? null,
          entityProject: meta?.project ?? null,
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
