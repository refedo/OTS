import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const scopeDetailSchema = z.object({
  buildingId: z.string().min(1),
  scopeType: z.enum(['steel', 'roof_sheeting', 'wall_sheeting', 'deck_panel', 'metal_work', 'other']),
  scopeLabel: z.string().min(1),
  customLabel: z.string().optional().nullable(),
  specification: z.string().optional().nullable(),
  // Quantity & unit
  quantity: z.number().optional().nullable(),
  unit: z.enum(['ton', 'm2', 'Lm', 'LS']).optional().nullable(),
  // Sandwich panel (roof/wall sheeting)
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

const createSchema = scopeDetailSchema.extend({
  projectId: z.string().min(1),
});

const bulkCreateSchema = z.object({
  projectId: z.string().min(1),
  scopes: z.array(scopeDetailSchema),
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
              quantity: scope.quantity ? scope.quantity : null,
              unit: scope.unit || null,
              ralColor: scope.ralColor || null,
              panelThickness: scope.panelThickness || null,
              ribHeight: scope.ribHeight || null,
              upperSheetThick: scope.upperSheetThick || null,
              lowerSheetThick: scope.lowerSheetThick || null,
              panelProfile: scope.panelProfile || null,
              deckProfile: scope.deckProfile || null,
              hasShearStuds: scope.hasShearStuds ?? false,
              shearStudQty: scope.shearStudQty || null,
              shearStudSpecs: scope.shearStudSpecs || null,
              metalWorkItems: scope.metalWorkItems || undefined,
              coatingSameAsProject: scope.coatingSameAsProject ?? true,
              scopeCoatingSystem: scope.scopeCoatingSystem || undefined,
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
        quantity: parsed.data.quantity ?? null,
        unit: parsed.data.unit || null,
        ralColor: parsed.data.ralColor || null,
        panelThickness: parsed.data.panelThickness || null,
        ribHeight: parsed.data.ribHeight || null,
        upperSheetThick: parsed.data.upperSheetThick || null,
        lowerSheetThick: parsed.data.lowerSheetThick || null,
        panelProfile: parsed.data.panelProfile || null,
        deckProfile: parsed.data.deckProfile || null,
        hasShearStuds: parsed.data.hasShearStuds ?? false,
        shearStudQty: parsed.data.shearStudQty || null,
        shearStudSpecs: parsed.data.shearStudSpecs || null,
        metalWorkItems: parsed.data.metalWorkItems || undefined,
        coatingSameAsProject: parsed.data.coatingSameAsProject ?? true,
        scopeCoatingSystem: parsed.data.scopeCoatingSystem || undefined,
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
