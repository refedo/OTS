/**
 * DELETE /api/hr/loans/[id]/payments/[paymentId]
 * Removes a payment record and recalculates the loan's installmentsPaid from
 * the remaining payments aggregate.
 *
 * 19.4.1
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const DELETE = withApiContext(async (_req: NextRequest, session, context) => {
  const { id, paymentId } = await (context as { params: Promise<{ id: string; paymentId: string }> }).params;

  const payment = await prisma.loanPayment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.loanId !== id) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  const loan = await prisma.loan.findUnique({ where: { id, deletedAt: null } });
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

  try {
    await prisma.loanPayment.delete({ where: { id: paymentId } });

    // Recalculate installmentsPaid from remaining payments
    const agg = await prisma.loanPayment.aggregate({
      where: { loanId: id },
      _sum: { amount: true },
    });
    const totalPaid = Number(agg._sum.amount ?? 0);
    const installmentAmt = Number(loan.installmentAmount);
    const newInstallmentsPaid = installmentAmt > 0
      ? Math.min(Math.floor(totalPaid / installmentAmt), loan.installmentsTotal)
      : 0;
    const newStatus = newInstallmentsPaid >= loan.installmentsTotal ? 'COMPLETED' : 'ACTIVE';

    await prisma.loan.update({
      where: { id },
      data: {
        installmentsPaid: newInstallmentsPaid,
        status: newStatus,
        updatedById: session!.userId,
      },
    });

    logger.info({ loanId: id, paymentId, newInstallmentsPaid }, '[LoanPayments] Payment deleted, loan recalculated');
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete loan payment');
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
});
