import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { PayrollPeriodDetailClient } from '@/components/hr/payroll-period-detail-client';

export const metadata: Metadata = { title: 'Payroll Period' };

export default async function PayrollPeriodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  if (!perms.includes('hr.payroll.view')) {
    redirect('/unauthorized?from=/hr/payroll');
  }

  const { id } = await params;
  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: {
      lines: {
        include: { employee: { select: { id: true, employmentId: true, fullNameEn: true } } },
        orderBy: { employee: { employmentId: 'asc' } },
      },
      adjustments: {
        where: { deletedAt: null },
        include: { employee: { select: { id: true, employmentId: true, fullNameEn: true } } },
        orderBy: { createdAt: 'desc' },
      },
      wpsExports: { orderBy: { generatedAt: 'desc' } },
    },
  });
  if (!period) notFound();

  const serialized = {
    id: period.id,
    year: period.year,
    month: period.month,
    status: period.status,
    cutoffDate: period.cutoffDate.toISOString(),
    payDate: period.payDate.toISOString(),
    calculatedAt: period.calculatedAt?.toISOString() ?? null,
    approvedAt: period.approvedAt?.toISOString() ?? null,
    lockedAt: period.lockedAt?.toISOString() ?? null,
    lines: period.lines.map((l) => ({
      id: l.id,
      employee: l.employee,
      basicSalary: l.basicSalary.toString(),
      grossPay: l.grossPay.toString(),
      totalDeductions: l.totalDeductions.toString(),
      totalAdditions: l.totalAdditions.toString(),
      netPay: l.netPay.toString(),
      gosiEmployee: l.gosiEmployee.toString(),
      overtimePay: l.overtimePay.toString(),
      overtimeHours: l.overtimeHours.toString(),
      unpaidLeaveDays: l.unpaidLeaveDays.toString(),
      unpaidLeaveDeduction: l.unpaidLeaveDeduction.toString(),
      paidLeaveDays: l.paidLeaveDays.toString(),
      absentDaysWithPermission: l.absentDaysWithPermission.toString(),
      absenceWithPermissionDeduction: l.absenceWithPermissionDeduction.toString(),
      absentDaysWithoutPermission: l.absentDaysWithoutPermission.toString(),
      absenceDeduction: l.absenceDeduction.toString(),
      loanDeduction: l.loanDeduction.toString(),
      custodyDeduction: l.custodyDeduction.toString(),
      violationDeduction: l.violationDeduction.toString(),
      payslipPdfPath: l.payslipPdfPath,
      dailyRate: l.dailyRate.toString(),
    })),
    adjustments: period.adjustments.map((a) => ({
      id: a.id,
      employeeId: a.employeeId,
      kind: a.kind,
      amount: a.amount.toString(),
      reason: a.reason,
      leaveDaysCompensated: a.leaveDaysCompensated?.toString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    wpsExports: period.wpsExports.map((w) => ({
      id: w.id,
      filename: w.filename,
      filePath: w.filePath,
      totalEmployees: w.totalEmployees,
      totalNet: w.totalNet.toString(),
      status: w.status,
      generatedAt: w.generatedAt.toISOString(),
    })),
  };

  return (
    <PayrollPeriodDetailClient
      period={serialized}
      canCalculate={perms.includes('hr.payroll.calculate')}
      canApprove={perms.includes('hr.payroll.approve')}
      canLock={perms.includes('hr.payroll.lock')}
      canExport={perms.includes('hr.payroll.export')}
      canAdjust={perms.includes('hr.payroll.adjust')}
    />
  );
}
