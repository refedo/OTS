import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';
import { workflowService } from '@/lib/services/workflow.service';
import prisma from '@/lib/db';

export const GET = withApiContext(async (_req, session) => {
  const canView = await checkPermission('workflow.my-approvals.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const userId = session!.userId;

  try {
    // Pending action: ACTIVE steps where user is listed approver and hasn't decided
    const pendingSteps = await workflowService.getPendingApprovalsForUser(userId);
    const pendingAction = pendingSteps.length;

    // My submissions by status
    const submissionGroups = await prisma.workflowInstance.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { initiatedById: userId },
    });
    const mySubmissions = {
      inProgress: 0,
      approved: 0,
      rejected: 0,
    };
    for (const g of submissionGroups) {
      if (g.status === 'IN_PROGRESS' || g.status === 'PENDING') mySubmissions.inProgress += g._count._all;
      else if (g.status === 'APPROVED') mySubmissions.approved += g._count._all;
      else if (g.status === 'REJECTED') mySubmissions.rejected += g._count._all;
    }

    // Recent items: instances user is involved in (initiated OR decided on OR pending action)
    const decidedRows = await prisma.workflowApproval.findMany({
      where: { userId },
      select: { stepInstance: { select: { instanceId: true } } },
    });
    const decidedIds = decidedRows.map(a => a.stepInstance.instanceId);
    const pendingInstanceIds = pendingSteps
      .filter(s => s.instance !== null)
      .map(s => s.instanceId);

    const initiatedRows = await prisma.workflowInstance.findMany({
      where: { initiatedById: userId },
      select: { id: true },
    });
    const initiatedIds = initiatedRows.map(r => r.id);

    const allIds = [...new Set([...initiatedIds, ...decidedIds, ...pendingInstanceIds])].slice(0, 500);

    const recentInstances = allIds.length > 0
      ? await prisma.workflowInstance.findMany({
          where: { id: { in: allIds } },
          include: {
            definition: { select: { name: true } },
            initiatedBy: { select: { name: true } },
            stepInstances: {
              where: { status: 'ACTIVE' },
              select: {
                resolvedApprovers: true,
                step: { select: { name: true } },
              },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : [];

    const recentItems = recentInstances.map(inst => {
      const activeStep = inst.stepInstances[0] ?? null;
      const approvers = activeStep
        ? ((activeStep.resolvedApprovers ?? []) as { name: string }[]).map(a => a.name).slice(0, 2)
        : [];

      return {
        id: inst.id,
        entityType: inst.entityType,
        entityId: inst.entityId,
        workflowName: inst.definition.name,
        status: inst.status,
        initiatedByName: inst.initiatedBy.name,
        createdAt: inst.createdAt,
        currentStepName: activeStep?.step?.name ?? null,
        currentApprovers: approvers,
      };
    });

    return NextResponse.json({ pendingAction, mySubmissions, recentItems });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch approvals summary');
    return NextResponse.json({ error: 'Failed to fetch approvals summary' }, { status: 500 });
  }
});
