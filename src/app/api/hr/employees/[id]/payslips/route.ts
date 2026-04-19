import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

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

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, employmentId: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const dolibarrUserId = parseInt(employee.employmentId ?? '', 10);

  const [dolibarrRows, otsLines] = await Promise.all([
    // Dolibarr historical salaries from fin_salaries (raw SQL table)
    (async () => {
      if (!dolibarrUserId || isNaN(dolibarrUserId)) return [];
      try {
        const rows: Record<string, unknown>[] = await prisma.$queryRawUnsafe(
          `SELECT dolibarr_id, ref, label, salary, amount, date_start, date_end, date_payment, is_paid
           FROM fin_salaries
           WHERE fk_user = ? AND is_active = 1
           ORDER BY date_start DESC`,
          dolibarrUserId,
        );
        return rows.map((r: Record<string, unknown>) => ({
          id: Number(r.dolibarr_id),
          ref: (r.ref as string) || `SAL-${r.dolibarr_id}`,
          label: (r.label as string) || null,
          salary: Number(r.salary ?? 0),
          amount: Number(r.amount ?? 0),
          dateStart: r.date_start ? new Date(r.date_start as string).toISOString().slice(0, 10) : '',
          dateEnd: r.date_end ? new Date(r.date_end as string).toISOString().slice(0, 10) : '',
          datePayment: r.date_payment ? new Date(r.date_payment as string).toISOString().slice(0, 10) : null,
          isPaid: r.is_paid === 1 || r.is_paid === true,
        }));
      } catch (e) {
        // fin_salaries table may not exist yet (financial sync not run)
        logger.warn({ error: e }, '[Payslips] fin_salaries query failed — table may not exist');
        return [];
      }
    })(),

    // OTS payroll lines
    prisma.payrollLine.findMany({
      where: { employeeId: id },
      include: { period: { select: { id: true, year: true, month: true, payDate: true, status: true } } },
      orderBy: [{ period: { year: 'desc' } }, { period: { month: 'desc' } }],
    }),
  ]);

  const ots = otsLines.map((l) => ({
    lineId: l.id,
    periodId: l.period.id,
    periodLabel: `${MONTHS[(l.period.month ?? 1) - 1]} ${l.period.year}`,
    year: l.period.year,
    month: l.period.month,
    payDate: l.period.payDate.toISOString().slice(0, 10),
    periodStatus: l.period.status,
    basicSalary: Number(l.basicSalary),
    housingAllowance: Number(l.housingAllowance),
    transportAllowance: Number(l.transportAllowance),
    mobileAllowance: Number(l.mobileAllowance),
    foodAllowance: Number(l.foodAllowance),
    otherAllowances: Number(l.otherAllowances),
    totalAllowances:
      Number(l.housingAllowance) +
      Number(l.transportAllowance) +
      Number(l.mobileAllowance) +
      Number(l.foodAllowance) +
      Number(l.otherAllowances),
    overtimePay: Number(l.overtimePay),
    grossPay: Number(l.grossPay),
    totalDeductions: Number(l.totalDeductions),
    netPay: Number(l.netPay),
    payslipPdfPath: l.payslipPdfPath ?? null,
  }));

  return NextResponse.json({ dolibarr: dolibarrRows, ots });
}
