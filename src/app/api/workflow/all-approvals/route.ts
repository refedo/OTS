import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';

const querySchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  entityType: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const instanceInclude = {
  definition: { select: { key: true, name: true, entityType: true } },
  initiatedBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
  stepInstances: {
    orderBy: { sequence: 'asc' as const },
    include: {
      step: { select: { name: true, sequence: true, slaHours: true } },
      approvals: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
} as const;

export const GET = withApiContext(async (req, session) => {
  const canViewAll = await checkPermission('workflow.instances.view');
  const canViewOwn = await checkPermission('workflow.my-approvals.view');

  if (!canViewAll && !canViewOwn) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    entityType: searchParams.get('entityType') ?? undefined,
    page: searchParams.get('page') ?? 1,
    limit: searchParams.get('limit') ?? 20,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters', issues: parsed.error.flatten() }, { status: 422 });
  }

  const { status, entityType, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  try {
    if (canViewAll) {
      // Admin / CEO path — return all instances
      const baseWhere = {
        ...(status ? { status } : {}),
        ...(entityType ? { entityType } : {}),
      };

      const [items, total] = await Promise.all([
        prisma.workflowInstance.findMany({
          where: baseWhere,
          include: instanceInclude,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.workflowInstance.count({ where: baseWhere }),
      ]);

      const statusCounts = await prisma.workflowInstance.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: entityType ? { entityType } : {},
      });

      const counts = Object.fromEntries(
        statusCounts.map((r: { status: string; _count: { _all: number } }) => [r.status, r._count._all])
      );

      return NextResponse.json({ items, total, page, limit, statusCounts: counts });
    }

    // Non-admin path — find instances the user is involved in
    const userId = session!.userId;

    // 1. Instances user initiated
    const initiatedRows = await prisma.workflowInstance.findMany({
      where: { initiatedById: userId },
      select: { id: true },
    });
    const initiatedIds = initiatedRows.map(r => r.id);

    // 2. Instances user made a decision on
    const approvalRows = await prisma.workflowApproval.findMany({
      where: { userId },
      select: { stepInstance: { select: { instanceId: true } } },
    });
    const decidedIds = approvalRows.map(a => a.stepInstance.instanceId);

    // 3. Instances with an ACTIVE step where user is a listed approver
    const activeStepRows = await prisma.workflowStepInstance.findMany({
      where: { status: 'ACTIVE' },
      select: { instanceId: true, resolvedApprovers: true },
    });
    const pendingIds = activeStepRows
      .filter(s => {
        const approvers = (s.resolvedApprovers ?? []) as { userId: string }[];
        return approvers.some(a => a.userId === userId);
      })
      .map(s => s.instanceId);

    const allIds = [...new Set([...initiatedIds, ...decidedIds, ...pendingIds])].slice(0, 1000);

    if (allIds.length === 0) {
      return NextResponse.json({ items: [], total: 0, page, limit, statusCounts: {} });
    }

    const involvedWhere = {
      id: { in: allIds },
      ...(status ? { status } : {}),
      ...(entityType ? { entityType } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.workflowInstance.findMany({
        where: involvedWhere,
        include: instanceInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflowInstance.count({ where: involvedWhere }),
    ]);

    const statusCountRows = await prisma.workflowInstance.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { id: { in: allIds }, ...(entityType ? { entityType } : {}) },
    });
    const counts = Object.fromEntries(
      statusCountRows.map((r: { status: string; _count: { _all: number } }) => [r.status, r._count._all])
    );

    return NextResponse.json({ items, total, page, limit, statusCounts: counts });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch all approvals');
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
});
