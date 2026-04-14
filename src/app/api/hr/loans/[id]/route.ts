/**
 * PUT    /api/hr/loans/[id]  — update status / installmentsPaid / cancel
 * DELETE /api/hr/loans/[id]  — soft-delete
 *
 * 18.10.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  installmentsPaid: z.coerce.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
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

  const loan = await prisma.loan.findUnique({ where: { id, deletedAt: null } });
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

  try {
    const updated = await prisma.loan.update({
      where: { id },
      data: { ...parsed.data, updatedById: session!.userId },
    });
    logger.info({ loanId: id }, '[Loans] Updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update loan');
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, context) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const body: unknown = await req.json().catch(() => ({}));
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'deleteReason is required' }, { status: 400 });
  }

  const loan = await prisma.loan.findUnique({ where: { id, deletedAt: null } });
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

  try {
    await prisma.loan.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session!.userId,
        deleteReason: parsed.data.deleteReason,
        status: 'CANCELLED',
      },
    });
    logger.info({ loanId: id }, '[Loans] Deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete loan');
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 });
  }
});
