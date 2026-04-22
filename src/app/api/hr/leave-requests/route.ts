/**
 * GET  /api/hr/leave-requests — list leave requests
 *   - default: just the caller's own (via User.employeeId)
 *   - ?scope=all : all employees (requires hr.leaves.viewAll)
 *   - ?scope=inbox : pending approval by the current user
 *   - ?employeeId=<uuid>: filter to a specific employee (requires hr.leaves.viewAll)
 * POST /api/hr/leave-requests — create a new request. DRAFT by default;
 *   pass { submit: true } to go straight to PENDING_MANAGER.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { computeLeaveBalance, countWorkingDays } from '@/lib/services/hr/leave-balance-calculator';
import { getLeavesSettings } from '@/lib/services/hr/system-config';

const createSchema = z.object({
  leaveTypeId: z.string().uuid(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().max(1000).optional().nullable(),
  employeeId: z.string().uuid().optional(), // HR can create on behalf of an employee
  submit: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const scope = req.nextUrl.searchParams.get('scope') ?? 'mine';
  const employeeIdFilter = req.nextUrl.searchParams.get('employeeId');

  // Look up the caller's linked employee (may be null).
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { employeeId: true },
  });

  const where: Record<string, unknown> = { deletedAt: null };

  if (scope === 'all' || employeeIdFilter) {
    const canViewAll = await checkPermission('hr.leaves.viewAll');
    if (!canViewAll) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (employeeIdFilter) where.employeeId = employeeIdFilter;
  } else if (scope === 'inbox') {
    // Pending requests this user is expected to approve. For the MVP we
    // return anything PENDING_* — the UI filters by role. A stricter
    // implementation would match the stage to the caller's permissions.
    const canApprove = await checkPermission('hr.leaves.approve');
    if (!canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    where.status = { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_CEO'] };
  } else {
    // Mine
    if (!me?.employeeId) return NextResponse.json([]);
    where.employeeId = me.employeeId;
  }

  const rows = await prisma.leaveRequest.findMany({
    where,
    include: {
      leaveType: true,
      employee: { select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { employeeId: true },
  });

  let employeeId = d.employeeId;
  if (!employeeId) {
    if (!me?.employeeId) {
      return NextResponse.json({ error: 'Your account has no linked employee' }, { status: 400 });
    }
    employeeId = me.employeeId;
  } else if (employeeId !== me?.employeeId) {
    // Creating on behalf of someone else requires HR permission
    const canViewAll = await checkPermission('hr.leaves.viewAll');
    if (!canViewAll) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isSelf = employeeId === me?.employeeId;
  const canRequest = await checkPermission('hr.leaves.request');
  if (!canRequest && !isSelf) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const startDate = new Date(d.startDate);
  const endDate = new Date(d.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
  }

  const leaveType = await prisma.leaveType.findUnique({ where: { id: d.leaveTypeId } });
  if (!leaveType) return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });

  const calendarDays =
    Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  const workingDays = await countWorkingDays(startDate, endDate, !leaveType.countPublicHolidays);

  // Balance snapshot + over-balance check
  const year = startDate.getFullYear();
  const snap = await computeLeaveBalance(employeeId, d.leaveTypeId, year);
  const wasOverBalance = workingDays > snap.available;
  if (wasOverBalance && !leaveType.allowNegativeBalance) {
    return NextResponse.json(
      { error: `Insufficient balance: requesting ${workingDays}, available ${snap.available.toFixed(2)}`, balance: snap },
      { status: 400 },
    );
  }

  const settings = await getLeavesSettings();
  const submit = d.submit === true;
  const status = submit
    ? settings.approvalChain === 'HR_ONLY'
      ? 'PENDING_HR'
      : 'PENDING_MANAGER'
    : 'DRAFT';

  const created = await prisma.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId: d.leaveTypeId,
      startDate,
      endDate,
      calendarDays,
      workingDays: workingDays.toString(),
      reason: d.reason ?? null,
      status,
      submittedAt: submit ? new Date() : null,
      balanceAtRequest: snap.available.toString(),
      wasOverBalance,
      createdById: session.sub,
    },
    include: { leaveType: true },
  });

  logger.info(
    { id: created.id, employeeId, status, workingDays, wasOverBalance },
    '[LeaveRequest] Created',
  );
  return NextResponse.json(created, { status: 201 });
}
