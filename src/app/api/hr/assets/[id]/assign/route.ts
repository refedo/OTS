/**
 * POST /api/hr/assets/[id]/assign — assign an asset to an employee
 *
 * Sets asset.status = ASSIGNED and creates an AssetAssignment row.
 * Rejects if the asset already has an ACTIVE assignment.
 *
 * 18.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const schema = z.object({
  employeeId: z.string().uuid(),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

  if (asset.status === 'RETIRED' || asset.status === 'LOST') {
    return NextResponse.json({ error: `Cannot assign a ${asset.status.toLowerCase()} asset` }, { status: 409 });
  }

  const activeAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId: id, status: 'ACTIVE', deletedAt: null },
  });
  if (activeAssignment) {
    return NextResponse.json({ error: 'Asset already has an active assignment. Return it before re-assigning.' }, { status: 409 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  try {
    const [assignment] = await prisma.$transaction([
      prisma.assetAssignment.create({
        data: {
          assetId: id,
          employeeId: parsed.data.employeeId,
          assignedDate: new Date(parsed.data.assignedDate),
          status: 'ACTIVE',
          notes: parsed.data.notes ?? null,
          createdById: session!.userId,
        },
      }),
      prisma.asset.update({
        where: { id },
        data: { status: 'ASSIGNED', updatedById: session!.userId },
      }),
    ]);
    logger.info({ assetId: id, employeeId: parsed.data.employeeId }, '[Assets] Assigned');
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    logger.error({ error, id }, 'Failed to assign asset');
    return NextResponse.json({ error: 'Failed to assign asset' }, { status: 500 });
  }
});
