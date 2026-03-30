import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  projectId: z.string().min(1),
  buildingId: z.string().min(1),
  scopeType: z.enum(['steel', 'roof_sheeting', 'wall_sheeting', 'deck_panel', 'metal_work', 'other']),
  scopeLabel: z.string().min(1),
  customLabel: z.string().optional().nullable(),
  specification: z.string().optional().nullable(),
});

const bulkCreateSchema = z.object({
  projectId: z.string().min(1),
  scopes: z.array(z.object({
    buildingId: z.string().min(1),
    scopeType: z.enum(['steel', 'roof_sheeting', 'wall_sheeting', 'deck_panel', 'metal_work', 'other']),
    scopeLabel: z.string().min(1),
    customLabel: z.string().optional().nullable(),
    specification: z.string().optional().nullable(),
  })),
});

export const GET = withApiContext(async (req, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const buildingId = searchParams.get('buildingId');

    const where: Record<string, string> = {};
    if (projectId) where.projectId = projectId;
    if (buildingId) where.buildingId = buildingId;

    const scopes = await prisma.scopeOfWork.findMany({
      where,
      include: {
        building: { select: { id: true, name: true, designation: true } },
        activities: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ buildingId: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(scopes);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch scope of work entries');
    return NextResponse.json({ error: 'Failed to fetch scope of work' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req, session) => {
  try {
    const body = await req.json();

    // Support bulk creation
    if (body.scopes && Array.isArray(body.scopes)) {
      const parsed = bulkCreateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
      }

      const created = await prisma.$transaction(
        parsed.data.scopes.map((scope) =>
          prisma.scopeOfWork.create({
            data: {
              projectId: parsed.data.projectId,
              buildingId: scope.buildingId,
              scopeType: scope.scopeType,
              scopeLabel: scope.scopeLabel,
              customLabel: scope.customLabel || null,
              specification: scope.specification || null,
            },
          })
        )
      );

      return NextResponse.json(created, { status: 201 });
    }

    // Single creation
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const scope = await prisma.scopeOfWork.create({
      data: {
        projectId: parsed.data.projectId,
        buildingId: parsed.data.buildingId,
        scopeType: parsed.data.scopeType,
        scopeLabel: parsed.data.scopeLabel,
        customLabel: parsed.data.customLabel || null,
        specification: parsed.data.specification || null,
      },
    });

    return NextResponse.json(scope, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create scope of work');
    return NextResponse.json(
      { error: 'Failed to create scope of work', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
