/**
 * PUT    /api/hr/custodies/[id]  — update deductionAmount, status, notes
 * DELETE /api/hr/custodies/[id]  — soft-delete
 *
 * 18.10.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  deductionAmount: z.coerce.number().min(0).optional(),
  settledAmount: z.coerce.number().min(0).optional(),
  status: z.enum(['OPEN', 'PARTIALLY_SETTLED', 'SETTLED']).optional(),
  notes: z.string().max(500).optional(),
}).strict();

const deleteSchema = z.object({
  deleteReason: z.string().max(500),
});

export const PUT = withApiContext(async (req: NextRequest, session, context) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const body: unknown = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const custody = await prisma.custody.findUnique({ where: { id, deletedAt: null } });
  if (!custody) return NextResponse.json({ error: 'Custody not found' }, { status: 404 });

  const updateData: Record<string, unknown> = { updatedById: session!.userId };
  if (parsed.data.deductionAmount !== undefined) updateData.deductionAmount = parsed.data.deductionAmount.toString();
  if (parsed.data.settledAmount !== undefined) {
    const settled = parsed.data.settledAmount;
    updateData.settledAmount = settled.toString();
    const total = Number(custody.amount);
    if (settled >= total) updateData.status = 'SETTLED';
    else if (settled > 0) updateData.status = 'PARTIALLY_SETTLED';
    else updateData.status = 'OPEN';
  }
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  try {
    const updated = await prisma.custody.update({ where: { id }, data: updateData });
    logger.info({ custodyId: id }, '[Custodies] Updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update custody');
    return NextResponse.json({ error: 'Failed to update custody' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, context) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const body: unknown = await req.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'deleteReason is required' }, { status: 400 });
  }

  const custody = await prisma.custody.findUnique({ where: { id, deletedAt: null } });
  if (!custody) return NextResponse.json({ error: 'Custody not found' }, { status: 404 });

  try {
    await prisma.custody.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session!.userId,
        deleteReason: parsed.data.deleteReason,
      },
    });
    logger.info({ custodyId: id }, '[Custodies] Deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete custody');
    return NextResponse.json({ error: 'Failed to delete custody' }, { status: 500 });
  }
});
