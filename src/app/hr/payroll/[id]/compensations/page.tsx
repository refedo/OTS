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
          employee: { select: { id: true, employmentId: true, fullNameEn: true, dateOfJoining: true } },
        },
        orderBy: { employee: { fullNameEn: 'asc' } },
      },
    },
  });
  if (!period) notFound();

  // Compute annual leave balances using Formula A (all-time accrual, not year-scoped snapshot)
  const employeeIds = period.lines.map((l) => l.employeeId);
  const annualLeaveType = await prisma.leaveType.findFirst({
    where: { code: 'ANNUAL', archivedAt: null },
    select: { id: true },
  });

  const [approvedLeaveRequests, manualAdjustments] = await Promise.all([
    annualLeaveType && employeeIds.length > 0
      ? prisma.leaveRequest.findMany({
          where: {
            deletedAt: null,
            status: 'APPROVED',
            employeeId: { in: employeeIds },
            leaveTypeId: annualLeaveType.id,
          },
          select: { employeeId: true, workingDays: true },
        })
      : Promise.resolve([]),
    annualLeaveType && employeeIds.length > 0
      ? prisma.leaveBalance.findMany({
          where: { employeeId: { in: employeeIds }, leaveTypeId: annualLeaveType.id },
          select: { employeeId: true, manualAdjustment: true },
        })
      : Promise.resolve([]),
  ]);

  const consumedMap = new Map<string, number>();
  for (const req of approvedLeaveRequests) {
    consumedMap.set(req.employeeId, (consumedMap.get(req.employeeId) ?? 0) + Number(req.workingDays));
  }
  const adjustmentMap = new Map<string, number>(
    manualAdjustments.map((b) => [b.employeeId, Number(b.manualAdjustment ?? 0)]),
  );

  const today = new Date();
  const MONTHLY_ACCRUAL = 1.75;

  const balanceByEmployee = new Map<string, number>();
  for (const line of period.lines) {
    const joinDate = line.employee.dateOfJoining ? new Date(line.employee.dateOfJoining) : null;
    let entitledDays = 0;
    if (joinDate) {
      const months = Math.max(0, Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
      entitledDays = Math.floor(months * MONTHLY_ACCRUAL * 10) / 10;
    }
    const consumed = consumedMap.get(line.employeeId) ?? 0;
    const adjustment = adjustmentMap.get(line.employeeId) ?? 0;
    balanceByEmployee.set(line.employeeId, Math.max(0, entitledDays - consumed + adjustment));
  }

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
