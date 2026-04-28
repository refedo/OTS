import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';

const stepSchema = z.object({
  sequence: z.number().int().min(1),
  name: z.string().min(1).max(200),
  approverResolver: z.record(z.unknown()),
  minApprovals: z.number().int().min(1).default(1),
  slaHours: z.number().int().positive().optional(),
  onRejectBehavior: z.enum(['RETURN_PREVIOUS', 'RESTART', 'TERMINATE']).default('RETURN_PREVIOUS'),
  conditions: z.array(z.record(z.unknown())).optional().nullable(),
});

const replaceStepsSchema = z.object({
  steps: z.array(stepSchema).min(1),
});

export const PUT = withApiContext(async (req, session, ctx) => {
  const { id } = await ctx!.params;
  const canManage = await checkPermission('workflow.definitions.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = replaceStepsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const definition = await prisma.workflowDefinition.findFirst({ where: { id, deletedAt: null } });
    if (!definition) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const inFlightCount = await prisma.workflowInstance.count({
      where: { definitionId: id, status: 'IN_PROGRESS' },
    });

    if (inFlightCount > 0) {
      return NextResponse.json(
        { error: 'Cannot replace steps while workflow instances are in progress. Cancel or complete them first.' },
        { status: 409 },
      );
    }

    await prisma.$transaction([
      prisma.workflowStep.deleteMany({ where: { definitionId: id } }),
      ...parsed.data.steps.map(s =>
        prisma.workflowStep.create({
          data: {
            definitionId: id,
            sequence: s.sequence,
            name: s.name,
            approverResolver: s.approverResolver,
            minApprovals: s.minApprovals,
            slaHours: s.slaHours ?? null,
            onRejectBehavior: s.onRejectBehavior,
            conditions: s.conditions ?? null,
          },
        })
      ),
    ]);

    const updated = await prisma.workflowDefinition.findUnique({
      where: { id },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to replace workflow steps');
    return NextResponse.json({ error: 'Failed to replace workflow steps' }, { status: 500 });
  }
});
