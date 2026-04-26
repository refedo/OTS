import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';

export const GET = withApiContext(async (req, session, ctx) => {
  const { id } = await ctx!.params;
  const canView = await checkPermission('workflow.instances.view');
  const canApprove = await checkPermission('workflow.my-approvals.view');
  if (!canView && !canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id },
      include: {
        definition: { select: { key: true, name: true, entityType: true } },
        initiatedBy: { select: { id: true, name: true, email: true } },
        cancelledBy: { select: { id: true, name: true } },
        stepInstances: {
          orderBy: { sequence: 'asc' },
          include: {
            step: { select: { name: true, sequence: true, slaHours: true, onRejectBehavior: true } },
            approvals: {
              include: { user: { select: { id: true, name: true, email: true } } },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
    if (!instance) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(instance);
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch workflow instance');
    return NextResponse.json({ error: 'Failed to fetch workflow instance' }, { status: 500 });
  }
});
