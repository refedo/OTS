/**
 * GET  /api/hr/loans/[id]/payments  — list all payments for a loan
 * POST /api/hr/loans/[id]/payments  — record a new payment (increments installmentsPaid)
 *
 * 19.3.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  paymentType: z.enum(['SCHEDULED', 'ADJUSTED']).default('SCHEDULED'),
  amount: z.coerce.number().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

export const GET = withApiContext(async (_req: NextRequest, _session, context) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const loan = await prisma.loan.findUnique({ where: { id, deletedAt: null } });
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

  const payments = await prisma.loanPayment.findMany({
    where: { loanId: id },
    orderBy: { paymentDate: 'desc' },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(payments);
});

export const POST = withApiContext(async (req: NextRequest, session, context) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const loan = await prisma.loan.findUnique({ where: { id, deletedAt: null } });
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  if (loan.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Loan is not active' }, { status: 400 });
  }

  const { paymentType, amount, paymentDate, notes } = parsed.data;

  // Determine how many installments this payment covers (min 1)
  const installmentCount = Math.max(1, Math.round(amount / Number(loan.installmentAmount)));
  const newPaid = Math.min(loan.installmentsPaid + installmentCount, loan.installmentsTotal);
  const isComplete = newPaid >= loan.installmentsTotal;

  try {
    const [payment] = await prisma.$transaction([
      prisma.loanPayment.create({
        data: {
          loanId: id,
          paymentType,
          amount,
          paymentDate: new Date(paymentDate),
          notes: notes ?? null,
          createdById: session!.userId,
        },
      }),
      prisma.loan.update({
        where: { id },
        data: {
          installmentsPaid: newPaid,
          status: isComplete ? 'COMPLETED' : 'ACTIVE',
          updatedById: session!.userId,
        },
      }),
    ]);

    logger.info({ loanId: id, paymentType, amount }, '[LoanPayments] Payment recorded');
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to record loan payment');
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
});
