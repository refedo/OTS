/**
 * Governance API - Statistics
 * 
 * Dashboard statistics for governance data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

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
      // Total audit logs
      prisma.auditLog.count(),
      
      // Today's audit logs
      prisma.auditLog.count({
        where: { performedAt: { gte: today } },
      }),
      
      // Total versions
      prisma.entityVersion.count(),
      
      // Deleted counts
      prisma.project.count({ where: { deletedAt: { not: null } } }),
      prisma.building.count({ where: { deletedAt: { not: null } } }),
      prisma.assemblyPart.count({ where: { deletedAt: { not: null } } }),
      
      // Audit logs by action (last 30 days)
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        where: {
          performedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Recent activity (last 10)
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { performedAt: 'desc' },
        include: {
          performedBy: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      auditLogs: {
        total: totalAuditLogs,
        today: todayAuditLogs,
        byAction: auditByAction.reduce((acc, item) => {
          acc[item.action] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
      versions: {
        total: totalVersions,
      },
      deleted: {
        projects: deletedProjects,
        buildings: deletedBuildings,
        assemblyParts: deletedParts,
        total: deletedProjects + deletedBuildings + deletedParts,
      },
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        action: log.action,
        performedBy: log.performedBy,
        performedAt: log.performedAt,
        reason: log.reason,
      })),
    });
  } catch (error) {
    console.error('[Governance API] Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch governance stats' },
      { status: 500 }
    );
  }
}
