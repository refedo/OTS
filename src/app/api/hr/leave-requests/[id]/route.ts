/**
 * GET    /api/hr/leave-requests/[id] — fetch one
 * PUT    /api/hr/leave-requests/[id] — update (only owner + DRAFT status)
 * DELETE /api/hr/leave-requests/[id] — soft-delete own DRAFT / cancel submitted
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { countWorkingDays } from '@/lib/services/hr/leave-balance-calculator';

const updateSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().max(1000).nullable().optional(),
  leaveTypeId: z.string().uuid().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const row = await prisma.leaveRequest.findFirst({
    where: { id, deletedAt: null },
    include: {
      leaveType: true,
      employee: { select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true } },
    },
  });
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { employeeId: true } });
  if (me?.employeeId !== row.employeeId) {
    const canViewAll = await checkPermission('hr.leaves.viewAll');
    if (!canViewAll) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(row);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.leaveRequest.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (existing.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only DRAFT requests can be edited' }, { status: 400 });
  }

  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { employeeId: true } });
  if (me?.employeeId !== existing.employeeId) {
    const canViewAll = await checkPermission('hr.leaves.viewAll');
    if (!canViewAll) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { updatedById: session.sub };
  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : existing.startDate;
  const endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : existing.endDate;
  if (parsed.data.startDate || parsed.data.endDate) {
    if (endDate < startDate) return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    data.startDate = startDate;
    data.endDate = endDate;
    data.calendarDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    data.workingDays = (await countWorkingDays(startDate, endDate)).toString();
  }
  if (parsed.data.reason !== undefined) data.reason = parsed.data.reason;
  if (parsed.data.leaveTypeId) data.leaveTypeId = parsed.data.leaveTypeId;

  const updated = await prisma.leaveRequest.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.leaveRequest.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { employeeId: true } });
  const isOwner = me?.employeeId === existing.employeeId;
  if (!isOwner) {
    const canViewAll = await checkPermission('hr.leaves.viewAll');
    if (!canViewAll) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (existing.status === 'APPROVED' || existing.status === 'REJECTED') {
    return NextResponse.json({ error: 'Cannot cancel a finalised request' }, { status: 400 });
  }

  await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      deletedAt: new Date(),
      updatedById: session.sub,
    },
  });
  logger.info({ id, userId: session.sub }, '[LeaveRequest] Cancelled');
  return NextResponse.json({ success: true });
}
