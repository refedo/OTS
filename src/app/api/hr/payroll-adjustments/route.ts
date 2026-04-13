/**
 * GET  /api/hr/payroll-adjustments?periodId=<uuid> — list adjustments for a period
 * POST /api/hr/payroll-adjustments — add one. If period was CALCULATED,
 *      flip it back to DRAFT so HR must recalc before approving.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const createSchema = z.object({
  periodId: z.string().uuid(),
  employeeId: z.string().uuid(),
  kind: z.enum(['BONUS', 'DEDUCTION', 'ADVANCE_REPAYMENT', 'FINE', 'OTHER']),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
});

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

  const created = await prisma.payrollAdjustment.create({
    data: {
      periodId: d.periodId,
      employeeId: d.employeeId,
      kind: d.kind,
      amount: d.amount.toString(),
      reason: d.reason,
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

  logger.info({ id: created.id, periodId: d.periodId, kind: d.kind }, '[Payroll] Adjustment added');
  return NextResponse.json(created, { status: 201 });
}
