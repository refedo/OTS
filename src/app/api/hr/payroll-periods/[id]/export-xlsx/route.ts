/**
 * GET /api/hr/payroll-periods/[id]/export-xlsx
 * Streams an XLSX file with all payroll lines for the period.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.payroll.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;

  try {
    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            employee: {
              select: { id: true, employmentId: true, fullNameEn: true, nationalId: true, jobTitleEn: true },
            },
          },
          orderBy: { employee: { employmentId: 'asc' } },
        },
      },
    });

    if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

    const periodLabel = `${MONTHS[period.month - 1]} ${period.year}`;

    const rows = period.lines.map((l) => ({
      'Emp ID': l.employee.employmentId,
      'Full Name': l.employee.fullNameEn,
      'National ID': l.employee.nationalId ?? '',
      'Job Title': l.employee.jobTitleEn ?? '',
      'Basic Salary': Number(l.basicSalary),
      'Housing Allowance': Number(l.housingAllowance),
      'Transport Allowance': Number(l.transportAllowance),
      'Mobile Allowance': Number(l.mobileAllowance),
      'Food Allowance': Number(l.foodAllowance),
      'Other Allowances': Number(l.otherAllowances),
      'Gross Pay': Number(l.grossPay),
      'OT Hours': Number(l.overtimeHours),
      'Overtime Pay': Number(l.overtimePay),
      'Bonuses': Number(l.bonuses),
      'Other Additions': Number(l.otherAdditions),
      'Total Additions': Number(l.totalAdditions),
      'Leave w/ Permission (days)': Number(l.absentDaysWithPermission),
      'Leave w/ Permission Ded': Number(l.absenceWithPermissionDeduction),
      'Leave w/o Permission (days)': Number(l.absentDaysWithoutPermission),
      'Leave w/o Permission Ded': Number(l.absenceDeduction),
      'Unpaid Leave (days)': Number(l.unpaidLeaveDays),
      'Unpaid Leave Ded': Number(l.unpaidLeaveDeduction),
      'GOSI (Employee)': Number(l.gosiEmployee),
      'Loan Deduction': Number(l.loanDeduction),
      'Custody Deduction': Number(l.custodyDeduction),
      'Violation Deduction': Number(l.violationDeduction),
      'Other Deductions': Number(l.otherDeductions),
      'Total Deductions': Number(l.totalDeductions),
      'Net Pay': Number(l.netPay),
      'Bank': l.bankName ?? '',
      'IBAN': l.bankIban ?? '',
      'Calendar Days': l.calendarDays,
      'Working Days': l.workingDays,
      'Worked Days': Number(l.workedDays),
      'Paid Leave (days)': Number(l.paidLeaveDays),
      'Public Holidays': Number(l.publicHolidayDays),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const filename = `Payroll_${period.year}_${String(period.month).padStart(2, '0')}_${periodLabel.replace(' ', '_')}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error({ error, id }, '[Payroll] XLSX export failed');
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
