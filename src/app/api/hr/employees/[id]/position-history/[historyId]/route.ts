/**
 * PUT    /api/hr/employees/[id]/position-history/[historyId] — edit notes/title
 *        on an existing row. Does NOT shift effective dates (those are
 *        immutable to keep the timeline contiguous).
 * DELETE /api/hr/employees/[id]/position-history/[historyId] — soft-delete.
 *        Re-opens the previous row if the deleted row was the currently-open
 *        one (setting its effectiveTo back to null).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  positionTitle: z.string().min(1).max(200).optional(),
  section: z.string().max(60).nullable().optional(),
  division: z.string().max(80).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
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

  const canManage = await checkPermission('hr.employee.positionHistory.manage');
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

  const existing = await prisma.employeePositionHistory.findFirst({
    where: { id: historyId, employeeId: id, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.employeePositionHistory.update({
    where: { id: historyId },
    data: {
      ...parsed.data,
      updatedById: session.sub,
    },
    include: { department: { select: { id: true, name: true } } },
  });

  logger.info({ employeeId: id, historyId }, '[EmployeePositionHistory] Updated');
  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; historyId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.employee.positionHistory.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, historyId } = await context.params;
  const url = new URL(req.url);
  const reason = url.searchParams.get('reason') ?? undefined;

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.employeePositionHistory.findFirst({
      where: { id: historyId, employeeId: id, deletedAt: null },
    });
    if (!row) return null;

    await tx.employeePositionHistory.update({
      where: { id: historyId },
      data: {
        deletedAt: new Date(),
        deletedById: session.sub,
        deleteReason: reason,
      },
    });

    // If we just deleted the currently-open row, re-open the most recent
    // prior row by clearing its effectiveTo.
    if (row.effectiveTo === null) {
      const prior = await tx.employeePositionHistory.findFirst({
        where: {
          employeeId: id,
          deletedAt: null,
          id: { not: historyId },
          effectiveFrom: { lt: row.effectiveFrom },
        },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (prior) {
        await tx.employeePositionHistory.update({
          where: { id: prior.id },
          data: { effectiveTo: null, updatedById: session.sub },
        });
      }
    }
    return row;
  });

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  logger.info({ employeeId: id, historyId }, '[EmployeePositionHistory] Deleted');
  return NextResponse.json({ ok: true });
}
