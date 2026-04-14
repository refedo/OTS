/**
 * PUT    /api/hr/employees/[id]/salary-history/[historyId] — edit a DRAFT row.
 *        Once a row has moved past DRAFT it is immutable except through the
 *        /status action route (approve/reject).
 * DELETE /api/hr/employees/[id]/salary-history/[historyId] — soft-delete a row.
 *        If the row was the currently-open APPROVED row, re-opens the prior
 *        APPROVED row by clearing its effectiveTo.
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

const updateSchema = z.object({
  effectiveFrom: z.string().min(1).optional(),
  basicSalary: decimalString.optional(),
  housingAllowance: decimalString.optional(),
  transportAllowance: decimalString.optional(),
  mobileAllowance: decimalString.optional(),
  foodAllowance: decimalString.optional(),
  otherAllowances: decimalString.optional(),
  reason: z.nativeEnum(EmployeeSalaryChangeReason).optional(),
  notes: z.string().max(1000).nullable().optional(),
  positionHistoryId: z.string().uuid().nullable().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? await verifySession(token) : null;
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string; historyId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.employee.salaryHistory.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, historyId } = await context.params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const existing = await prisma.employeeSalaryHistory.findFirst({
    where: { id: historyId, employeeId: id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status !== 'DRAFT') {
    return NextResponse.json(
      { error: `Cannot edit row in status ${existing.status} — only DRAFT rows are mutable. Reject and re-draft instead.` },
      { status: 409 },
    );
  }

  const updated = await prisma.employeeSalaryHistory.update({
    where: { id: historyId },
    data: {
      effectiveFrom: d.effectiveFrom ? new Date(d.effectiveFrom) : undefined,
      basicSalary: d.basicSalary,
      housingAllowance: d.housingAllowance,
      transportAllowance: d.transportAllowance,
      mobileAllowance: d.mobileAllowance,
      foodAllowance: d.foodAllowance,
      otherAllowances: d.otherAllowances,
      reason: d.reason,
      notes: d.notes,
      positionHistoryId: d.positionHistoryId,
      updatedById: session.sub,
    },
  });

  logger.info({ employeeId: id, historyId }, '[EmployeeSalaryHistory] Updated draft');
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; historyId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.employee.salaryHistory.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, historyId } = await context.params;
  const url = new URL(req.url);
  const reason = url.searchParams.get('reason') ?? undefined;

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.employeeSalaryHistory.findFirst({
      where: { id: historyId, employeeId: id, deletedAt: null },
    });
    if (!row) return null;

    await tx.employeeSalaryHistory.update({
      where: { id: historyId },
      data: {
        deletedAt: new Date(),
        deletedById: session.sub,
        deleteReason: reason,
      },
    });

    // If the deleted row was an active APPROVED open row, re-open the prior
    // APPROVED row so the timeline stays continuous.
    if (row.status === 'APPROVED' && row.effectiveTo === null) {
      const prior = await tx.employeeSalaryHistory.findFirst({
        where: {
          employeeId: id,
          deletedAt: null,
          status: 'APPROVED',
          id: { not: historyId },
          effectiveFrom: { lt: row.effectiveFrom },
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (prior) {
        await tx.employeeSalaryHistory.update({
          where: { id: prior.id },
          data: { effectiveTo: null, updatedById: session.sub },
        });
      }
    }
    return row;
  });

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  logger.info({ employeeId: id, historyId }, '[EmployeeSalaryHistory] Deleted');
  return NextResponse.json({ ok: true });
}
