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

  // Aggregate all existing payments to compute true cumulative total paid
  const existingAgg = await prisma.loanPayment.aggregate({
    where: { loanId: id },
    _sum: { amount: true },
  });
  const existingTotal = Number(existingAgg._sum.amount ?? 0);
  const newTotalPaid = existingTotal + amount;

  // installmentsPaid = full installments covered by cumulative payments
  const installmentAmt = Number(loan.installmentAmount);
  const newInstallmentsPaid = installmentAmt > 0
    ? Math.min(Math.floor(newTotalPaid / installmentAmt), loan.installmentsTotal)
    : loan.installmentsPaid;
  const isComplete = newInstallmentsPaid >= loan.installmentsTotal;

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
          installmentsPaid: newInstallmentsPaid,
          status: isComplete ? 'COMPLETED' : 'ACTIVE',
          updatedById: session!.userId,
        },
      }),
    ]);

    logger.info({ loanId: id, paymentType, amount, newTotalPaid, newInstallmentsPaid }, '[LoanPayments] Payment recorded');
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to record loan payment');
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
});
