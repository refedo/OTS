/**
 * GET /api/hr/payroll-periods/[id]/compensation-data
 * Returns per-employee data needed for the compensation dialog:
 *   - dailyRate (from PayrollLine)
 *   - annualLeaveBalance (Formula A: entitled - consumed + manualAdjustment)
 *   - annualLeaveValue (balance × dailyRate)
 * Only returns employees who have a calculated PayrollLine in this period.
 *
 * Formula A: entitled = floor(monthsSinceJoining × 1.75 × 10) / 10
 *            consumed = sum of all-time approved ANNUAL workingDays
 *            balance  = max(0, entitled - consumed + manualAdjustment)
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
      employee: { select: { id: true, employmentId: true, fullNameEn: true, dateOfJoining: true } },
    },
    orderBy: { employee: { fullNameEn: 'asc' } },
  });

  const employeeIds = lines.map((l) => l.employeeId);

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

  const employees = lines.map((l) => {
    const dailyRate = Number(l.dailyRate);
    const joinDate = l.employee.dateOfJoining ? new Date(l.employee.dateOfJoining) : null;
    let entitledDays = 0;
    if (joinDate) {
      const months = Math.max(0, Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
      entitledDays = Math.floor(months * MONTHLY_ACCRUAL * 10) / 10;
    }
    const consumed = consumedMap.get(l.employeeId) ?? 0;
    const adjustment = adjustmentMap.get(l.employeeId) ?? 0;
    const annualLeaveBalance = Number(Math.max(0, entitledDays - consumed + adjustment).toFixed(2));
    return {
      id: l.employeeId,
      employmentId: l.employee.employmentId,
      fullNameEn: l.employee.fullNameEn,
      dailyRate: dailyRate.toFixed(4),
      annualLeaveBalance,
      annualLeaveValue: Number((annualLeaveBalance * dailyRate).toFixed(2)),
    };
  });

  return NextResponse.json({ employees });
}
