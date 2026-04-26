import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';

const stepSchema = z.object({
  sequence: z.number().int().min(1),
  name: z.string().min(1),
  approverResolver: z.record(z.unknown()),
  minApprovals: z.number().int().min(1).default(1),
  slaHours: z.number().int().positive().optional(),
  onRejectBehavior: z.enum(['RETURN_PREVIOUS', 'RESTART', 'TERMINATE']).default('RETURN_PREVIOUS'),
  conditions: z.array(z.record(z.unknown())).optional(),
});

const createSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[A-Z0-9_]+$/, 'Key must be uppercase letters, digits, and underscores'),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  entityType: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
  siteId: z.string().optional(),
  steps: z.array(stepSchema).min(1),
});

export const GET = withApiContext(async (req) => {
  const canView = await checkPermission('workflow.definitions.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const activeOnly = searchParams.get('active') !== 'false';

    const definitions = await prisma.workflowDefinition.findMany({
      where: {
        deletedAt: null,
        ...(entityType ? { entityType } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: { steps: { orderBy: { sequence: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(definitions);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch workflow definitions');
    return NextResponse.json({ error: 'Failed to fetch workflow definitions' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req, session) => {
  const canManage = await checkPermission('workflow.definitions.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { steps, ...defData } = parsed.data;

  try {
    const existing = await prisma.workflowDefinition.findFirst({
      where: { key: defData.key, deletedAt: null },
    });
    if (existing) {
      return NextResponse.json({ error: 'A workflow definition with this key already exists' }, { status: 409 });
    }

    const definition = await prisma.workflowDefinition.create({
      data: {
        ...defData,
        steps: {
          create: steps.map(s => ({
            sequence: s.sequence,
            name: s.name,
            approverResolver: s.approverResolver,
            minApprovals: s.minApprovals,
            slaHours: s.slaHours ?? null,
            onRejectBehavior: s.onRejectBehavior,
            conditions: s.conditions ?? null,
          })),
        },
      },
      include: { steps: { orderBy: { sequence: 'asc' } } },
    });
    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create workflow definition');
    return NextResponse.json({ error: 'Failed to create workflow definition' }, { status: 500 });
  }
});
