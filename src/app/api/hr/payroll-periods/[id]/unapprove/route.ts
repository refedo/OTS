/**
 * POST /api/hr/payroll-periods/[id]/unapprove — revert APPROVED → CALCULATED
 *
 * Requires hr.payroll.approve permission. Only works on APPROVED periods
 * (not LOCKED or PAID). Clears approvedAt/approvedById.
 *
 * Note: loan installment advances and custody settlement advances that were
 * auto-applied on approval are NOT reversed — those require manual correction
 * via the loan/custody management screens.
 *
 * 18.18.0
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

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

  if (period.status !== 'APPROVED') {
    return NextResponse.json(
      { error: 'Only APPROVED periods can be reverted. LOCKED periods cannot be undone.' },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.payrollPeriod.update({
      where: { id },
      data: {
        status: 'CALCULATED',
        approvedAt: null,
        approvedById: null,
      },
    });

    logger.info(
      { periodId: id, year: period.year, month: period.month, revertedBy: session.sub },
      '[Payroll] Approval reverted APPROVED → CALCULATED',
    );

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id }, '[Payroll] Unapprove failed');
    return NextResponse.json({ error: 'Failed to revert approval' }, { status: 500 });
  }
}
