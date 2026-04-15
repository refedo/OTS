/**
 * POST /api/hr/assets/[id]/return — return an asset from its current assignee
 *
 * Closes the active AssetAssignment (sets returnedDate, status=RETURNED)
 * and sets asset.status back to AVAILABLE.
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const schema = z.object({
  returnedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnReason: z
    .enum(['VACATION', 'RESIGNATION', 'TERMINATION', 'TRANSFER', 'MAINTENANCE', 'EXPIRED', 'PROJECT_END', 'OTHER'])
    .optional(),
  notes: z.string().max(500).optional(),
});

export const POST = withApiContext(async (req: NextRequest, session, ctx) => {
  const id = ctx?.params?.id as string;
  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const asset = await prisma.asset.findFirst({ where: { id, deletedAt: null } });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  const activeAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId: id, status: 'ACTIVE', deletedAt: null },
  });
  if (!activeAssignment) {
    return NextResponse.json({ error: 'No active assignment found for this asset' }, { status: 409 });
  }

  try {
    const [assignment] = await prisma.$transaction([
      prisma.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          returnedDate: new Date(parsed.data.returnedDate),
          status: 'RETURNED',
          returnReason: parsed.data.returnReason ?? null,
          notes: parsed.data.notes ?? activeAssignment.notes,
          updatedById: session!.userId,
        },
      }),
      prisma.asset.update({
        where: { id },
        data: { status: 'AVAILABLE', updatedById: session!.userId },
      }),
    ]);
    logger.info({ assetId: id, assignmentId: activeAssignment.id }, '[Assets] Returned');
    return NextResponse.json(assignment);
  } catch (error) {
    logger.error({ error, id }, 'Failed to return asset');
    return NextResponse.json({ error: 'Failed to return asset' }, { status: 500 });
  }
});
