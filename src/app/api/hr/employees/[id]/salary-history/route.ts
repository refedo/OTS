/**
 * GET  /api/hr/employees/[id]/salary-history — list an employee's salary timeline
 * POST /api/hr/employees/[id]/salary-history — draft a new salary change
 *
 * New rows land in status=DRAFT by default. Rolling a raise through the
 * approval cycle (DRAFT → PENDING_HR → PENDING_CEO → APPROVED) happens via
 * the dedicated /status action route. Only APPROVED rows take effect — the
 * payroll calculator must filter `status = APPROVED` when resolving the
 * effective compensation on any given date.
 *
 * When an APPROVED row is created directly (HIRED backfill), it is inserted
 * with effectiveTo=null and the previous open APPROVED row is closed off.
 * For DRAFT/PENDING rows we do NOT touch the timeline yet — only the final
 * approval step mutates effectiveTo/effectiveFrom on neighbours.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { EmployeeSalaryChangeReason } from '@prisma/client';

const decimalString = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'number' ? v.toString() : v))
  .refine((v) => /^-?\d+(\.\d+)?$/.test(v), { message: 'Must be a decimal number' });

const createSchema = z.object({
  effectiveFrom: z.string().min(1),
  basicSalary: decimalString,
  housingAllowance: decimalString.optional(),
  transportAllowance: decimalString.optional(),
  mobileAllowance: decimalString.optional(),
  foodAllowance: decimalString.optional(),
  otherAllowances: decimalString.optional(),
  reason: z.nativeEnum(EmployeeSalaryChangeReason),
  notes: z.string().max(1000).nullable().optional(),
  positionHistoryId: z.string().uuid().nullable().optional(),
  submit: z.boolean().optional(), // true -> push to PENDING_HR immediately
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? await verifySession(token) : null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.employee.salaryHistory.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;

  const rows = await prisma.employeeSalaryHistory.findMany({
    where: { employeeId: id, deletedAt: null },
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    include: {
      positionHistory: { select: { id: true, positionTitle: true } },
      createdBy: { select: { id: true, name: true } },
      submittedBy: { select: { id: true, name: true } },
      hrApprovedBy: { select: { id: true, name: true } },
      ceoApprovedBy: { select: { id: true, name: true } },
      rejectedBy: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.employee.salaryHistory.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const effectiveFrom = new Date(d.effectiveFrom);
  if (Number.isNaN(effectiveFrom.getTime())) {
    return NextResponse.json({ error: 'Invalid effectiveFrom date' }, { status: 400 });
  }

  const submit = d.submit === true;

  const created = await prisma.employeeSalaryHistory.create({
    data: {
      employeeId: id,
      effectiveFrom,
      effectiveTo: null, // the status action route sets this on final approval
      basicSalary: d.basicSalary,
      housingAllowance: d.housingAllowance ?? '0',
      transportAllowance: d.transportAllowance ?? '0',
      mobileAllowance: d.mobileAllowance ?? '0',
      foodAllowance: d.foodAllowance ?? '0',
      otherAllowances: d.otherAllowances ?? '0',
      reason: d.reason,
      notes: d.notes ?? null,
      positionHistoryId: d.positionHistoryId ?? null,
      status: submit ? 'PENDING_HR' : 'DRAFT',
      submittedAt: submit ? new Date() : null,
      submittedById: submit ? session.sub : null,
      createdById: session.sub,
    },
    include: {
      positionHistory: { select: { id: true, positionTitle: true } },
    },
  });

  logger.info(
    { employeeId: id, historyId: created.id, reason: d.reason, status: created.status, effectiveFrom: d.effectiveFrom },
    '[EmployeeSalaryHistory] Drafted',
  );
  return NextResponse.json(created, { status: 201 });
}
