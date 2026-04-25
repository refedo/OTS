/**
 * GET  /api/hr/payroll-adjustments?periodId=<uuid> — list adjustments for a period
 * POST /api/hr/payroll-adjustments — add one. If period was CALCULATED,
 *      flip it back to DRAFT so HR must recalc before approving.
 *
 * Entitlement kinds (additions):
 *   ANNUAL_LEAVE_ALLOWANCE — compensates employee for N annual leave days (amount = N × dailyRate);
 *                            automatically deducts N days from the employee's annual leave balance.
 *   TICKET_ALLOWANCE       — travel ticket entitlement, manual SAR amount.
 *   EXIT_REENTRY_VISA      — exit/re-entry visa entitlement, manual SAR amount.
 *
 * Standard kinds:
 *   BONUS | DEDUCTION | ADVANCE_REPAYMENT | FINE | OTHER
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const ENTITLEMENT_KINDS = ['ANNUAL_LEAVE_ALLOWANCE', 'TICKET_ALLOWANCE', 'EXIT_REENTRY_VISA', 'COMMISSION', 'INCENTIVE'] as const;
const STANDARD_KINDS = ['BONUS', 'DEDUCTION', 'ADVANCE_REPAYMENT', 'FINE', 'OTHER'] as const;
const ALL_KINDS = [...STANDARD_KINDS, ...ENTITLEMENT_KINDS] as const;

const createSchema = z.discriminatedUnion('kind', [
  // Annual leave allowance: days required, amount computed server-side from daily rate
  z.object({
    periodId: z.string().uuid(),
    employeeId: z.string().uuid(),
    kind: z.literal('ANNUAL_LEAVE_ALLOWANCE'),
    leaveDaysCompensated: z.number().positive().max(365),
    reason: z.string().min(1).max(500),
  }),
  // Entitlement allowances with manual amount
  z.object({
    periodId: z.string().uuid(),
    employeeId: z.string().uuid(),
    kind: z.enum(['TICKET_ALLOWANCE', 'EXIT_REENTRY_VISA', 'COMMISSION', 'INCENTIVE']),
    amount: z.number().positive(),
    reason: z.string().min(1).max(500),
  }),
  // Standard kinds: manual amount
  z.object({
    periodId: z.string().uuid(),
    employeeId: z.string().uuid(),
    kind: z.enum(STANDARD_KINDS),
    amount: z.number().positive(),
    reason: z.string().min(1).max(500),
  }),
]);

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.payroll.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const periodId = req.nextUrl.searchParams.get('periodId');
  const rows = await prisma.payrollAdjustment.findMany({
    where: { ...(periodId ? { periodId } : {}), deletedAt: null },
    include: {
      employee: { select: { id: true, employmentId: true, fullNameEn: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canAdjust = await checkPermission('hr.payroll.adjust');
  if (!canAdjust) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const period = await prisma.payrollPeriod.findUnique({ where: { id: d.periodId } });
  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 });
  if (period.status === 'LOCKED') {
    return NextResponse.json({ error: 'Period is locked' }, { status: 400 });
  }

  let finalAmount: number;
  let leaveDaysCompensated: number | null = null;

  if (d.kind === 'ANNUAL_LEAVE_ALLOWANCE') {
    // Compute amount from the employee's daily rate in this period's PayrollLine
    const line = await prisma.payrollLine.findUnique({
      where: { periodId_employeeId: { periodId: d.periodId, employeeId: d.employeeId } },
      select: { dailyRate: true },
    });
    if (!line) {
      return NextResponse.json(
        { error: 'No payroll line found for this employee. Run Calculate first before adding Annual Leave Allowance.' },
        { status: 400 },
      );
    }
    leaveDaysCompensated = d.leaveDaysCompensated;
    const days = leaveDaysCompensated;
    finalAmount = Math.round(Number(line.dailyRate) * days * 100) / 100;
    if (finalAmount <= 0) {
      return NextResponse.json({ error: 'Computed amount must be positive' }, { status: 400 });
    }

    // Deduct days from the employee's annual leave balance
    const annualLeaveType = await prisma.leaveType.findFirst({
      where: { code: 'ANNUAL', archivedAt: null },
      select: { id: true },
    });
    if (annualLeaveType) {
      const balanceYear = period.year;
      const existing = await prisma.leaveBalance.findUnique({
        where: { employeeId_leaveTypeId_year: { employeeId: d.employeeId, leaveTypeId: annualLeaveType.id, year: balanceYear } },
      });
      if (existing) {
        await prisma.leaveBalance.update({
          where: { id: existing.id },
          data: {
            manualAdjustment: { decrement: days },
            adjustmentReason: `Annual leave cash compensation — ${days} days paid via payroll ${period.year}/${String(period.month).padStart(2, '0')}`,
            asOfDate: new Date(),
          },
        });
      } else {
        await prisma.leaveBalance.create({
          data: {
            employeeId: d.employeeId,
            leaveTypeId: annualLeaveType.id,
            year: balanceYear,
            openingBalance: 0,
            accruedYtd: 0,
            usedYtd: 0,
            carriedOver: 0,
            manualAdjustment: -days,
            adjustmentReason: `Annual leave cash compensation — ${days} days paid via payroll ${period.year}/${String(period.month).padStart(2, '0')}`,
            asOfDate: new Date(),
          },
        });
      }
    }
  } else {
    finalAmount = (d as { amount: number }).amount;
  }

  const created = await prisma.payrollAdjustment.create({
    data: {
      periodId: d.periodId,
      employeeId: d.employeeId,
      kind: d.kind,
      amount: finalAmount.toString(),
      reason: d.reason,
      leaveDaysCompensated: leaveDaysCompensated !== null ? leaveDaysCompensated.toString() : null,
      createdById: session.sub,
    },
  });

  // Any change after calculation → drop back to DRAFT to force a recalc.
  if (period.status === 'CALCULATED' || period.status === 'APPROVED') {
    await prisma.payrollPeriod.update({
      where: { id: d.periodId },
      data: { status: 'DRAFT', calculatedAt: null, approvedAt: null, approvedById: null },
    });
  }

  logger.info({ id: created.id, periodId: d.periodId, kind: d.kind, amount: finalAmount }, '[Payroll] Adjustment added');
  return NextResponse.json({ ...created, amount: finalAmount }, { status: 201 });
}
