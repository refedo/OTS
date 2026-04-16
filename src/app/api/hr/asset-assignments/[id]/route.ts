/**
 * PATCH /api/hr/asset-assignments/[id] — edit an existing AssetAssignment
 *
 * 18.15.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const patchSchema = z.object({
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const PATCH = withApiContext(async (req: NextRequest, session, ctx) => {
  const id = ctx?.params?.id as string;
  const body: unknown = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const assignment = await prisma.assetAssignment.findFirst({ where: { id, deletedAt: null } });
  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

  const d = parsed.data;
  try {
    const updated = await prisma.assetAssignment.update({
      where: { id },
      data: {
        ...(d.assignedDate !== undefined ? { assignedDate: new Date(d.assignedDate) } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedById: session!.userId,
      },
    });
    logger.info({ assignmentId: id }, '[AssetAssignments] Updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, 'Failed to update asset assignment');
    return NextResponse.json({ error: 'Failed to update asset assignment' }, { status: 500 });
  }
});
