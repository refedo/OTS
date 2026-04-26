import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  siteId: z.string().optional(),
});

export const GET = withApiContext(async (req, session, ctx) => {
  const { id } = await ctx!.params;
  const canView = await checkPermission('workflow.definitions.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const definition = await prisma.workflowDefinition.findFirst({
      where: { id, deletedAt: null },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    if (!definition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(definition);
  } catch (error) {
    logger.error({ error, id }, 'Failed to fetch workflow definition');
    return NextResponse.json({ error: 'Failed to fetch workflow definition' }, { status: 500 });
  }
});

export const PATCH = withApiContext(async (req, session, ctx) => {
  const { id } = await ctx!.params;
  const canManage = await checkPermission('workflow.definitions.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await prisma.workflowDefinition.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const hasInFlight = await prisma.workflowInstance.count({
      where: { definitionId: id, status: 'IN_PROGRESS' },
    });

    const definition = await prisma.workflowDefinition.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(hasInFlight ? { version: { increment: 1 } } : {}),
      },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    return NextResponse.json(definition);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update workflow definition');
    return NextResponse.json({ error: 'Failed to update workflow definition' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req, session, ctx) => {
  const { id } = await ctx!.params;
  const canManage = await checkPermission('workflow.definitions.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const existing = await prisma.workflowDefinition.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const hasInFlight = await prisma.workflowInstance.count({
      where: { definitionId: id, status: 'IN_PROGRESS' },
    });
    if (hasInFlight) {
      return NextResponse.json({ error: 'Cannot delete a definition with active workflow instances' }, { status: 409 });
    }

    await prisma.workflowDefinition.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete workflow definition');
    return NextResponse.json({ error: 'Failed to delete workflow definition' }, { status: 500 });
  }
});
