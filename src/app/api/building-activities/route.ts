import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const ACTIVITY_TYPES = [
  'arch_approval', 'material_approval', 'design', 'design_approval',
  'anchor_bolts', 'surveying_as_built', 'detailing', 'detailing_approval',
  'procurement', 'production', 'coating', 'dispatch', 'erection',
] as const;

const bulkCreateSchema = z.object({
  projectId: z.string().min(1),
  activities: z.array(z.object({
    buildingId: z.string().min(1),
    scopeOfWorkId: z.string().min(1),
    activityType: z.string().min(1),
    activityLabel: z.string().min(1),
    isApplicable: z.boolean().optional(),
    sortOrder: z.number().optional(),
  })),
});

export const GET = withApiContext(async (req, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const buildingId = searchParams.get('buildingId');
    const scopeOfWorkId = searchParams.get('scopeOfWorkId');

    const where: Record<string, string> = {};
    if (projectId) where.projectId = projectId;
    if (buildingId) where.buildingId = buildingId;
    if (scopeOfWorkId) where.scopeOfWorkId = scopeOfWorkId;

    const activities = await prisma.buildingActivity.findMany({
      where,
      include: {
        scopeOfWork: { select: { id: true, scopeType: true, scopeLabel: true } },
        building: { select: { id: true, name: true, designation: true } },
      },
      orderBy: [{ buildingId: 'asc' }, { scopeOfWorkId: 'asc' }, { sortOrder: 'asc' }],
    });

    return NextResponse.json(activities);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch building activities');
    return NextResponse.json({ error: 'Failed to fetch building activities' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req, session) => {
  try {
    const body = await req.json();
    const parsed = bulkCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const created = await prisma.$transaction(
      parsed.data.activities.map((activity) =>
        prisma.buildingActivity.create({
          data: {
            projectId: parsed.data.projectId,
            buildingId: activity.buildingId,
            scopeOfWorkId: activity.scopeOfWorkId,
            activityType: activity.activityType,
            activityLabel: activity.activityLabel,
            isApplicable: activity.isApplicable ?? true,
            sortOrder: activity.sortOrder || 0,
          },
        })
      )
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create building activities');
    return NextResponse.json(
      { error: 'Failed to create building activities', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
