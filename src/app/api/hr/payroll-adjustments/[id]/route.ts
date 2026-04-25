import { NextRequest, NextResponse } from 'next/server';
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canAdjust = await checkPermission('hr.payroll.adjust');
  if (!canAdjust) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const adj = await prisma.payrollAdjustment.findUnique({
    where: { id },
    include: { period: true },
  });
  if (!adj || adj.deletedAt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (adj.period.status === 'LOCKED') return NextResponse.json({ error: 'Period is locked' }, { status: 400 });

  // Soft-delete
  await prisma.payrollAdjustment.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Restore annual leave balance if this was a leave compensation
  if (adj.kind === 'ANNUAL_LEAVE_ALLOWANCE' && adj.leaveDaysCompensated) {
    const annualLeaveType = await prisma.leaveType.findFirst({
      where: { code: 'ANNUAL', archivedAt: null },
      select: { id: true },
    });
    if (annualLeaveType) {
      await prisma.leaveBalance.updateMany({
        where: { employeeId: adj.employeeId, leaveTypeId: annualLeaveType.id, year: adj.period.year },
        data: { manualAdjustment: { increment: Number(adj.leaveDaysCompensated) } },
      });
    }
  }

  // Revert period to DRAFT to force recalculation
  if (adj.period.status === 'CALCULATED' || adj.period.status === 'APPROVED') {
    await prisma.payrollPeriod.update({
      where: { id: adj.periodId },
      data: { status: 'DRAFT', calculatedAt: null, approvedAt: null, approvedById: null },
    });
  }

  logger.info({ id, kind: adj.kind, periodId: adj.periodId }, '[Payroll] Adjustment deleted');
  return NextResponse.json({ ok: true });
}
