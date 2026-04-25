/**
 * GET /api/hr/payroll-periods/[id]/compensation-data
 * Returns per-employee data needed for the compensation dialog:
 *   - dailyRate (from PayrollLine)
 *   - annualLeaveBalance (available days from LeaveBalance for current year)
 *   - annualLeaveValue (balance × dailyRate)
 * Only returns employees who have a calculated PayrollLine in this period.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await checkPermission('hr.payroll.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    select: { id: true, year: true },
  });
  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

  const lines = await prisma.payrollLine.findMany({
    where: { periodId: id },
    select: {
      employeeId: true,
      dailyRate: true,
      employee: { select: { id: true, employmentId: true, fullNameEn: true } },
    },
    orderBy: { employee: { fullNameEn: 'asc' } },
  });

  const employeeIds = lines.map((l) => l.employeeId);

  const annualLeaveType = await prisma.leaveType.findFirst({
    where: { code: 'ANNUAL', archivedAt: null },
    select: { id: true },
  });

  const balances = annualLeaveType && employeeIds.length > 0
    ? await prisma.leaveBalance.findMany({
        where: { employeeId: { in: employeeIds }, leaveTypeId: annualLeaveType.id, year: period.year },
        select: { employeeId: true, openingBalance: true, accruedYtd: true, usedYtd: true, manualAdjustment: true },
      })
    : [];

  const balanceMap = new Map(balances.map((b) => [
    b.employeeId,
    Math.max(0, Number(b.openingBalance) + Number(b.accruedYtd) - Number(b.usedYtd) + Number(b.manualAdjustment)),
  ]));

  const employees = lines.map((l) => {
    const dailyRate = Number(l.dailyRate);
    const annualLeaveBalance = balanceMap.get(l.employeeId) ?? 0;
    return {
      id: l.employeeId,
      employmentId: l.employee.employmentId,
      fullNameEn: l.employee.fullNameEn,
      dailyRate: dailyRate.toFixed(4),
      annualLeaveBalance: Number(annualLeaveBalance.toFixed(2)),
      annualLeaveValue: Number((annualLeaveBalance * dailyRate).toFixed(2)),
    };
  });

  return NextResponse.json({ employees });
}
