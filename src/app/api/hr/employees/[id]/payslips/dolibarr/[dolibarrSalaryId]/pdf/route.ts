import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { generateDolibarrPayslipPdf } from '@/lib/services/hr/dolibarr-payslip-pdf-generator';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; dolibarrSalaryId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.payroll.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, dolibarrSalaryId } = await context.params;
  const salaryId = parseInt(dolibarrSalaryId, 10);
  if (isNaN(salaryId)) return NextResponse.json({ error: 'Invalid salary ID' }, { status: 400 });

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      employmentId: true,
      fullNameEn: true,
      fullNameAr: true,
      nationalId: true,
      occupation: true,
      department: true,
      bankName: true,
    },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const dolibarrUserId = parseInt(employee.employmentId ?? '', 10);
  if (!dolibarrUserId || isNaN(dolibarrUserId)) {
    return NextResponse.json({ error: 'Employee has no Dolibarr user link' }, { status: 400 });
  }

  let salaryRow: Record<string, unknown> | null = null;
  try {
    const rows: Record<string, unknown>[] = await prisma.$queryRawUnsafe(
      `SELECT dolibarr_id, ref, label, salary, amount, date_start, date_end, date_payment, is_paid
       FROM fin_salaries
       WHERE dolibarr_id = ? AND fk_user = ? AND is_active = 1`,
      salaryId,
      dolibarrUserId,
    );
    salaryRow = rows[0] ?? null;
  } catch (e) {
    logger.error({ error: e }, '[DolibarrPayslipPdf] fin_salaries query failed');
    return NextResponse.json({ error: 'Salary data unavailable' }, { status: 503 });
  }

  if (!salaryRow) return NextResponse.json({ error: 'Salary record not found' }, { status: 404 });

  const toDateStr = (v: unknown): string | null => {
    if (!v) return null;
    try { return new Date(v as string).toISOString().slice(0, 10); } catch { return null; }
  };

  const pdfBuffer = await generateDolibarrPayslipPdf({
    id: salaryId,
    ref: (salaryRow.ref as string) || `SAL-${salaryId}`,
    label: (salaryRow.label as string) || null,
    salary: Number(salaryRow.salary ?? 0),
    amount: Number(salaryRow.amount ?? 0),
    dateStart: toDateStr(salaryRow.date_start) ?? '',
    dateEnd: toDateStr(salaryRow.date_end) ?? '',
    datePayment: toDateStr(salaryRow.date_payment),
    isPaid: salaryRow.is_paid === 1 || salaryRow.is_paid === true,
    employmentId: employee.employmentId,
    fullNameEn: employee.fullNameEn,
    fullNameAr: employee.fullNameAr,
    nationalId: employee.nationalId,
    occupation: employee.occupation,
    department: employee.department,
    bankName: employee.bankName,
  });

  const ref = (salaryRow.ref as string) || `SAL-${salaryId}`;
  const safeRef = ref.replace(/[^a-zA-Z0-9_-]/g, '-');

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="payslip-${safeRef}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
}
