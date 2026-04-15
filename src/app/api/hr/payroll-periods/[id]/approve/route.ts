/**
 * POST /api/hr/payroll-periods/[id]/approve — move CALCULATED → APPROVED
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { generateManpowerInvoicesForPeriod } from '@/lib/services/hr/manpower-invoice-generator';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canApprove = await checkPermission('hr.payroll.approve');
  if (!canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const period = await prisma.payrollPeriod.findUnique({ where: { id } });
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (period.status !== 'CALCULATED') {
    return NextResponse.json({ error: 'Only CALCULATED periods can be approved' }, { status: 400 });
  }

  const updated = await prisma.payrollPeriod.update({
    where: { id },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById: session.sub },
  });

  // 18.10.0 — Advance installmentsPaid on loans and settledAmount on custodies
  // for each line in this period. Do this in a best-effort loop (errors are
  // logged but don't roll back the approval — the payslip snapshot is the
  // source of truth for what was deducted).
  try {
    const lines = await prisma.payrollLine.findMany({
      where: { periodId: id },
      select: {
        employeeId: true,
        loanDeduction: true,
        custodyDeduction: true,
      },
    });

    for (const line of lines) {
      // Advance loan installments
      if (Number(line.loanDeduction) > 0) {
        const activeLoans = await prisma.loan.findMany({
          where: {
            employeeId: line.employeeId,
            status: 'ACTIVE',
            deletedAt: null,
          },
          orderBy: { startDate: 'asc' },
        });
        for (const loan of activeLoans) {
          if (loan.installmentsPaid >= loan.installmentsTotal) continue;
          const newPaid = loan.installmentsPaid + 1;
          const newStatus = newPaid >= loan.installmentsTotal ? 'COMPLETED' : 'ACTIVE';
          await prisma.loan.update({
            where: { id: loan.id },
            data: { installmentsPaid: newPaid, status: newStatus },
          });
        }
      }

      // Settle custody deductions
      if (Number(line.custodyDeduction) > 0) {
        let remaining = Number(line.custodyDeduction);
        const openCustodies = await prisma.custody.findMany({
          where: {
            employeeId: line.employeeId,
            status: { in: ['OPEN', 'PARTIALLY_SETTLED'] },
            deletedAt: null,
            deductionAmount: { gt: 0 },
          },
          orderBy: { issuedDate: 'asc' },
        });
        for (const custody of openCustodies) {
          if (remaining <= 0) break;
          const balance = Number(custody.amount) - Number(custody.settledAmount);
          const deducted = Math.min(remaining, balance);
          const newSettled = Number(custody.settledAmount) + deducted;
          const newStatus = newSettled >= Number(custody.amount) ? 'SETTLED' : 'PARTIALLY_SETTLED';
          await prisma.custody.update({
            where: { id: custody.id },
            data: {
              settledAmount: newSettled.toString(),
              status: newStatus,
              deductionAmount: newStatus === 'SETTLED' ? '0' : custody.deductionAmount,
            },
          });
          remaining -= deducted;
        }
      }
    }
  } catch (loopErr) {
    logger.warn({ error: loopErr, periodId: id }, '[Payroll] Loan/custody advancement had errors (non-fatal)');
  }

  // Phase 4 — Auto-generate manpower invoice drafts (non-fatal best-effort)
  try {
    const billingResult = await generateManpowerInvoicesForPeriod(id, session.sub);
    logger.info(
      { periodId: id, ...billingResult },
      '[ManpowerBilling] Invoice drafts auto-generated on period approval',
    );
  } catch (billingErr) {
    logger.warn({ error: billingErr, periodId: id }, '[ManpowerBilling] Auto-generation had errors (non-fatal)');
  }

  logger.info({ id }, '[Payroll] Period approved');
  return NextResponse.json(updated);
}
