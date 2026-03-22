import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'API:LcrAliases' });

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (_req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Existing alias mappings grouped by entityType
  const aliases = await prisma.lcrAliasMap.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  const grouped: Record<string, typeof aliases> = {
    supplier: aliases.filter(a => a.entityType === 'supplier'),
    building: aliases.filter(a => a.entityType === 'building'),
  };

  // Pending aliases: distinct raw values that have no FK resolved
  const pendingBuildings: Array<{ buildingNameRaw: string; count: bigint }> = await prisma.$queryRaw`
    SELECT buildingNameRaw AS buildingNameRaw, COUNT(*) AS count
    FROM lcr_entries
    WHERE isDeleted = false
      AND buildingNameRaw IS NOT NULL
      AND buildingNameRaw != ''
      AND buildingId IS NULL
      AND buildingNameRaw NOT IN (
        SELECT aliasText FROM lcr_alias_map WHERE entityType = 'building'
      )
    GROUP BY buildingNameRaw
    ORDER BY count DESC
  `;

  const pendingSuppliers: Array<{ awardedToRaw: string; count: bigint }> = await prisma.$queryRaw`
    SELECT awardedToRaw AS awardedToRaw, COUNT(*) AS count
    FROM lcr_entries
    WHERE isDeleted = false
      AND awardedToRaw IS NOT NULL
      AND awardedToRaw != ''
      AND supplierId IS NULL
      AND awardedToRaw NOT IN (
        SELECT aliasText FROM lcr_alias_map WHERE entityType = 'supplier'
      )
    GROUP BY awardedToRaw
    ORDER BY count DESC
  `;

  const pending = [
    ...pendingBuildings.map(p => ({
      aliasText: p.buildingNameRaw,
      entityType: 'building' as const,
      affectedRowCount: Number(p.count),
    })),
    ...pendingSuppliers.map(p => ({
      aliasText: p.awardedToRaw,
      entityType: 'supplier' as const,
      affectedRowCount: Number(p.count),
    })),
  ];

  return NextResponse.json({ aliases: grouped, pending });
});

const createAliasSchema = z.object({
  aliasText: z.string().min(1),
  entityType: z.enum(['supplier', 'building']),
  entityId: z.string().min(1),
  notes: z.string().optional(),
});

export const POST = withApiContext<any>(async (req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'Admin' && session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createAliasSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { aliasText, entityType, entityId, notes } = parsed.data;

  try {
    const alias = await prisma.lcrAliasMap.create({
      data: {
        aliasText,
        entityType,
        entityId,
        notes: notes ?? null,
        createdById: session.userId,
      },
    });

    // Back-fill: update LcrEntry rows where the raw field matches
    let backfilledCount = 0;
    if (entityType === 'building') {
      const result = await prisma.lcrEntry.updateMany({
        where: {
          buildingNameRaw: aliasText,
          buildingId: null,
          isDeleted: false,
        },
        data: { buildingId: entityId },
      });
      backfilledCount = result.count;
    } else if (entityType === 'supplier') {
      const supplierIdNum = parseInt(entityId, 10);
      const result = await prisma.lcrEntry.updateMany({
        where: {
          awardedToRaw: aliasText,
          supplierId: null,
          isDeleted: false,
        },
        data: { supplierId: isNaN(supplierIdNum) ? null : supplierIdNum },
      });
      backfilledCount = result.count;
    }

    // Re-evaluate resolution status for affected rows
    if (backfilledCount > 0) {
      // For rows that were just back-filled, check if all FKs are now resolved
      if (entityType === 'building') {
        await prisma.$executeRaw`
          UPDATE lcr_entries SET resolutionStatus = 'resolved'
          WHERE buildingNameRaw = ${aliasText}
            AND isDeleted = false
            AND resolutionStatus = 'pending'
            AND (projectNumber IS NULL OR projectId IS NOT NULL)
            AND (awardedToRaw IS NULL OR supplierId IS NOT NULL)
            AND (buildingNameRaw IS NULL OR buildingId IS NOT NULL)
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE lcr_entries SET resolutionStatus = 'resolved'
          WHERE awardedToRaw = ${aliasText}
            AND isDeleted = false
            AND resolutionStatus = 'pending'
            AND (projectNumber IS NULL OR projectId IS NOT NULL)
            AND (awardedToRaw IS NULL OR supplierId IS NOT NULL)
            AND (buildingNameRaw IS NULL OR buildingId IS NOT NULL)
        `;
      }
    }

    log.info({ aliasText, entityType, entityId, backfilledCount }, 'Alias created and back-filled');

    return NextResponse.json({ alias, backfilledCount });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Alias already exists for this entity type' }, { status: 409 });
    }
    log.error({ error }, 'Failed to create alias');
    return NextResponse.json({ error: 'Failed to create alias' }, { status: 500 });
  }
});

export const DELETE = withApiContext<any>(async (req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'Admin' && session.role !== 'CEO') {
    return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing alias id' }, { status: 400 });
  }

  await prisma.lcrAliasMap.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
