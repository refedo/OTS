import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { PayrollCompensationsClient } from '@/components/hr/payroll-compensations-client';

export const metadata: Metadata = { title: 'Payroll Compensations' };

export default async function PayrollCompensationsPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  if (!perms.includes('hr.payroll.view')) redirect('/unauthorized?from=/hr/payroll');

  const { id } = await params;

  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    select: {
      id: true, year: true, month: true, status: true,
      adjustments: {
        where: { deletedAt: null },
        include: {
          employee: { select: { id: true, employmentId: true, fullNameEn: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      lines: {
        select: {
          employeeId: true,
          dailyRate: true,
          employee: { select: { id: true, employmentId: true, fullNameEn: true } },
        },
        orderBy: { employee: { fullNameEn: 'asc' } },
      },
    },
  });
  if (!period) notFound();

  // Fetch annual leave balances for all employees in this period
  const employeeIds = period.lines.map((l) => l.employeeId);
  const annualLeaveType = await prisma.leaveType.findFirst({
    where: { code: 'ANNUAL', archivedAt: null },
    select: { id: true },
  });

  const leaveBalances = annualLeaveType && employeeIds.length > 0
    ? await prisma.leaveBalance.findMany({
        where: { employeeId: { in: employeeIds }, leaveTypeId: annualLeaveType.id, year: period.year },
        select: { employeeId: true, openingBalance: true, accruedYtd: true, usedYtd: true, manualAdjustment: true },
      })
    : [];

  const balanceByEmployee = new Map(leaveBalances.map((b) => [
    b.employeeId,
    Math.max(0, Number(b.openingBalance) + Number(b.accruedYtd) - Number(b.usedYtd) + Number(b.manualAdjustment)),
  ]));

  const serialized = {
    id: period.id,
    year: period.year,
    month: period.month,
    status: period.status,
    hasLines: period.lines.length > 0,
    adjustments: period.adjustments.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      employee: a.employee,
      kind: a.kind,
      amount: a.amount.toString(),
      reason: a.reason,
      leaveDaysCompensated: a.leaveDaysCompensated?.toString() ?? null,
      createdAt: a.createdAt.toISOString(),
      createdBy: a.createdBy.name,
    })),
    employees: period.lines.map((l) => {
      const dailyRate = Number(l.dailyRate);
      const balance = balanceByEmployee.get(l.employeeId) ?? 0;
      return {
        id: l.employeeId,
        employmentId: l.employee.employmentId,
        fullNameEn: l.employee.fullNameEn,
        dailyRate: dailyRate.toFixed(4),
        annualLeaveBalance: Number(balance.toFixed(2)),
        annualLeaveValue: Number((balance * dailyRate).toFixed(2)),
      };
    }),
  };

  return (
    <PayrollCompensationsClient
      period={serialized}
      canAdjust={perms.includes('hr.payroll.adjust')}
    />
  );
}
