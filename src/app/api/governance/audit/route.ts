/**
 * Governance API - Audit Trail
 *
 * READ-ONLY endpoints for viewing audit logs with full filtering support.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

const USER_SOURCES = ['UI', 'API'];
const SYSTEM_SOURCES = ['SYNC', 'AI', 'SYSTEM', 'CRON'];

type EntityMeta = { name: string; project: { projectNumber: string; name: string } | null };

async function resolveEntityMeta(
  logs: Array<{ entityType: string; entityId: string }>
): Promise<Map<string, EntityMeta>> {
  const map = new Map<string, EntityMeta>();

  const taskIds = logs.filter(l => l.entityType === 'Task' && l.entityId !== 'BATCH').map(l => l.entityId);
  const buildingIds = logs.filter(l => l.entityType === 'Building' && l.entityId !== 'BATCH').map(l => l.entityId);

  const [tasks, buildings] = await Promise.all([
    taskIds.length > 0
      ? prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, title: true, project: { select: { projectNumber: true, name: true } } },
        })
      : Promise.resolve([]),
    buildingIds.length > 0
      ? prisma.building.findMany({
          where: { id: { in: buildingIds } },
          select: { id: true, name: true, designation: true, project: { select: { projectNumber: true, name: true } } },
        })
      : Promise.resolve([]),
  ]);

  tasks.forEach(t => map.set(t.id, { name: t.title, project: t.project }));
  buildings.forEach(b => map.set(b.id, { name: b.name || b.designation, project: b.project }));

  return map;
}

export async function GET(req: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const sourceType = searchParams.get('sourceType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Prisma.AuditLogWhereInput = {
      ...(entityType && entityType !== 'all' && { entityType }),
      ...(entityId && { entityId }),
      ...(action && action !== 'all' && { action: action as Prisma.EnumAuditActionFilter }),
      ...(userId && { performedById: userId }),
      ...((dateFrom || dateTo) && {
        performedAt: {
          ...(dateFrom && { gte: new Date(dateFrom) }),
          ...(dateTo && { lte: new Date(dateTo) }),
        },
      }),
      ...(sourceType === 'user' && {
        OR: [
          { sourceModule: null },
          { sourceModule: { in: USER_SOURCES } },
        ],
      }),
      ...(sourceType === 'system' && {
        sourceModule: { in: SYSTEM_SOURCES },
      }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: limit,
        skip: offset,
        include: { performedBy: { select: { id: true, name: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const metaMap = await resolveEntityMeta(logs);

    const enrichedLogs = logs.map(log => {
      const meta = metaMap.get(log.entityId);
      return {
        ...log,
        entityName: meta?.name ?? null,
        entityProject: meta?.project ?? null,
      };
    });

    return NextResponse.json({ logs: enrichedLogs, total });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch audit logs');
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
