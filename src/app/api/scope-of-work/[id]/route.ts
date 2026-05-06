import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  scopeLabel: z.string().min(1).optional(),
  customLabel: z.string().optional().nullable(),
  specification: z.string().optional().nullable(),
  // Quantity & unit
  quantity: z.number().optional().nullable(),
  unit: z.enum(['ton', 'm2', 'Lm', 'LS']).optional().nullable(),
  // Sandwich panel
  ralColor: z.string().max(20).optional().nullable(),
  panelThickness: z.number().int().optional().nullable(),
  ribHeight: z.number().int().optional().nullable(),
  upperSheetThick: z.number().optional().nullable(),
  lowerSheetThick: z.number().optional().nullable(),
  panelProfile: z.enum(['flat', 'ribbed']).optional().nullable(),
  // Deck panel
  deckProfile: z.string().max(100).optional().nullable(),
  hasShearStuds: z.boolean().optional(),
  shearStudQty: z.number().int().optional().nullable(),
  shearStudSpecs: z.string().max(255).optional().nullable(),
  // Metal works
  metalWorkItems: z.array(z.object({
    name: z.string().min(1),
    unit: z.string().min(1),
    quantity: z.number(),
  })).optional().nullable(),
  // Per-scope coating
  coatingSameAsProject: z.boolean().optional(),
  scopeCoatingSystem: z.array(z.object({
    coatName: z.string(),
    microns: z.number().optional(),
    ralNumber: z.string().optional(),
  })).optional().nullable(),
});

export const GET = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/scope-of-work/')[1]?.split('?')[0];
    const scope = await prisma.scopeOfWork.findUnique({
      where: { id },
      include: {
        building: { select: { id: true, name: true, designation: true } },
        activities: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!scope) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(scope);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch scope of work');
    return NextResponse.json({ error: 'Failed to fetch scope of work' }, { status: 500 });
  }
});

export const PUT = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/scope-of-work/')[1]?.split('?')[0];
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const scope = await prisma.scopeOfWork.update({
      where: { id },
      data: {
        ...parsed.data,
        metalWorkItems: parsed.data.metalWorkItems ?? undefined,
        scopeCoatingSystem: parsed.data.scopeCoatingSystem ?? undefined,
      },
    });

    return NextResponse.json(scope);
  } catch (error) {
    logger.error({ error }, 'Failed to update scope of work');
    return NextResponse.json({ error: 'Failed to update scope of work' }, { status: 500 });
  }
});

export const PATCH = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/scope-of-work/')[1]?.split('?')[0];
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const scope = await prisma.scopeOfWork.update({
      where: { id },
      data: {
        ...parsed.data,
        metalWorkItems: parsed.data.metalWorkItems ?? undefined,
        scopeCoatingSystem: parsed.data.scopeCoatingSystem ?? undefined,
      },
    });

    return NextResponse.json(scope);
  } catch (error) {
    logger.error({ error }, 'Failed to patch scope of work');
    return NextResponse.json({ error: 'Failed to patch scope of work' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req, session) => {
  try {
    const id = req.url.split('/scope-of-work/')[1]?.split('?')[0];

    await prisma.scopeOfWork.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete scope of work');
    return NextResponse.json({ error: 'Failed to delete scope of work' }, { status: 500 });
  }
});
