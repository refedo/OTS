import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import type { Prisma } from '@prisma/client';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const ncr = await prisma.nCRReport.findUnique({
      where: { id },
      select: {
        id: true,
        ncrNumber: true,
        status: true,
        caWorkflowInstanceId: true,
        caResponsibleId: true,
        caRequired: true,
      },
    });

    if (!ncr) return NextResponse.json({ error: 'NCR not found' }, { status: 404 });
    if (!ncr.caRequired) return NextResponse.json({ error: 'Corrective action not marked as required' }, { status: 400 });
    if (ncr.caWorkflowInstanceId) return NextResponse.json({ error: 'CA workflow already started' }, { status: 409 });

    const definition = await prisma.workflowDefinition.findFirst({
      where: { key: 'ncr-corrective-action', isActive: true, deletedAt: null },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });

    if (!definition) {
      return NextResponse.json({ error: 'CA workflow definition not found — ensure migrations ran' }, { status: 500 });
    }

    // Create WorkflowInstance + first step instance in a transaction
    const instance = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const inst = await tx.workflowInstance.create({
        data: {
          id: crypto.randomUUID(),
          definitionId: definition.id,
          definitionVersion: definition.version,
          entityType: 'NCRReport',
          entityId: id,
          status: 'PENDING',
          initiatedById: session.sub,
          metadata: { ncrNumber: ncr.ncrNumber },
        },
      });

      // Activate first step
      const firstStep = definition.steps[0];
      if (firstStep) {
        const stepInst = await tx.workflowStepInstance.create({
          data: {
            id: crypto.randomUUID(),
            instanceId: inst.id,
            stepId: firstStep.id,
            sequence: firstStep.sequence,
            status: 'ACTIVE',
            requiredApprovals: firstStep.minApprovals,
            activatedAt: new Date(),
          },
        });

        await tx.workflowInstance.update({
          where: { id: inst.id },
          data: { currentStepId: stepInst.id, status: 'IN_PROGRESS' },
        });
      }

      // Link workflow to NCR
      await tx.nCRReport.update({
        where: { id },
        data: { caWorkflowInstanceId: inst.id },
      });

      return inst;
    });

    systemEventService.log({
      eventType: 'QC_NCR_CA_WORKFLOW_STARTED',
      eventCategory: 'QC',
      userId: session.sub,
      userName: session.name,
      entityType: 'NCRReport',
      entityId: id,
      entityName: ncr.ncrNumber,
      summary: `CA workflow started for NCR ${ncr.ncrNumber}`,
      details: { workflowInstanceId: instance.id },
    });

    return NextResponse.json({ workflowInstanceId: instance.id }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to start NCR CA workflow');
    return NextResponse.json({ error: 'Failed to start CA workflow' }, { status: 500 });
  }
}
