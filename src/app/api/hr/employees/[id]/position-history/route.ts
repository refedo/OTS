/**
 * GET  /api/hr/employees/[id]/position-history — list an employee's position timeline
 * POST /api/hr/employees/[id]/position-history — record a new position change
 *
 * Inserting a new row closes the current open row by setting its `effectiveTo`
 * to one day before the new row's `effectiveFrom`. There is always at most
 * ONE open row (effectiveTo = null) per employee. Pre-hire backfill anchors
 * a HIRED row dated from Employee.dateOfJoining.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { EmployeePositionChangeReason } from '@prisma/client';

const createSchema = z.object({
  effectiveFrom: z.string().min(1),
  positionTitle: z.string().min(1).max(200),
  section: z.string().max(60).nullable().optional(),
  division: z.string().max(80).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  reason: z.nativeEnum(EmployeePositionChangeReason),
  notes: z.string().max(1000).nullable().optional(),
  // When true, also update the Employee master row to reflect the new
  // position as the "current" state (occupation / section / division /
  // departmentId). Defaults to true — the history row is the source of
  // truth but Employee is kept in sync for dashboards and quick filters.
  syncEmployeeMaster: z.boolean().optional().default(true),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? await verifySession(token) : null;
}

function dayBefore(date: Date): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.employee.positionHistory.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;

  const rows = await prisma.employeePositionHistory.findMany({
    where: { employeeId: id, deletedAt: null },
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    include: {
      department: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.employee.positionHistory.manage');
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

  const created = await prisma.$transaction(async (tx) => {
    // Close the current open row, if any.
    const openRow = await tx.employeePositionHistory.findFirst({
      where: { employeeId: id, effectiveTo: null, deletedAt: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (openRow) {
      if (new Date(openRow.effectiveFrom) >= effectiveFrom) {
        throw new Error(
          `New position effectiveFrom (${d.effectiveFrom}) must be after the current open row's effectiveFrom (${openRow.effectiveFrom.toISOString().slice(0, 10)})`,
        );
      }
      await tx.employeePositionHistory.update({
        where: { id: openRow.id },
        data: {
          effectiveTo: dayBefore(effectiveFrom),
          updatedById: session.sub,
        },
      });
    }

    const row = await tx.employeePositionHistory.create({
      data: {
        employeeId: id,
        effectiveFrom,
        effectiveTo: null,
        positionTitle: d.positionTitle,
        section: d.section ?? null,
        division: d.division ?? null,
        departmentId: d.departmentId ?? null,
        reason: d.reason,
        notes: d.notes ?? null,
        createdById: session.sub,
      },
      include: {
        department: { select: { id: true, name: true } },
      },
    });

    if (d.syncEmployeeMaster !== false) {
      await tx.employee.update({
        where: { id },
        data: {
          occupation: d.positionTitle,
          section: d.section ?? null,
          division: d.division ?? null,
          departmentId: d.departmentId ?? null,
          updatedById: session.sub,
        },
      });
    }

    return row;
  });

  logger.info(
    { employeeId: id, historyId: created.id, reason: d.reason, effectiveFrom: d.effectiveFrom },
    '[EmployeePositionHistory] Created',
  );
  return NextResponse.json(created, { status: 201 });
}
