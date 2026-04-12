/**
 * POST /api/hr/leave-requests/[id]/action — submit / approve / reject a request.
 * Body: { action: 'submit' | 'approve' | 'reject', reason?: string }
 *
 * Approval chain from SystemConfig `leaves.approvalChain`:
 *   - MANAGER_HR_CEO (default): PENDING_MANAGER → PENDING_HR → PENDING_CEO → APPROVED
 *   - MANAGER_HR: PENDING_MANAGER → PENDING_HR → APPROVED
 *   - HR_ONLY:    PENDING_HR → APPROVED
 *
 * The stage-to-approver mapping for MVP is permissive: any user with
 * hr.leaves.approve can move the request forward; each approver is stamped
 * on its own column so the trail is auditable.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { getLeavesSettings } from '@/lib/services/hr/system-config';
import { refreshLeaveBalanceCache } from '@/lib/services/hr/leave-balance-calculator';
import type { LeaveRequestStatus } from '@prisma/client';

const actionSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject']),
  reason: z.string().max(500).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

function nextStatus(current: LeaveRequestStatus, chain: string): LeaveRequestStatus {
  if (chain === 'HR_ONLY') {
    return 'APPROVED';
  }
  if (chain === 'MANAGER_HR') {
    if (current === 'PENDING_MANAGER') return 'PENDING_HR';
    return 'APPROVED';
  }
  // Default MANAGER_HR_CEO
  if (current === 'PENDING_MANAGER') return 'PENDING_HR';
  if (current === 'PENDING_HR') return 'PENDING_CEO';
  return 'APPROVED';
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.leaveRequest.findFirst({
    where: { id, deletedAt: null },
    include: { leaveType: true },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { action, reason } = parsed.data;

  const settings = await getLeavesSettings();
  const updates: Record<string, unknown> = { updatedById: session.sub };

  if (action === 'submit') {
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT requests can be submitted' }, { status: 400 });
    }
    const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { employeeId: true } });
    if (me?.employeeId !== existing.employeeId) {
      const canViewAll = await checkPermission('hr.leaves.viewAll');
      if (!canViewAll) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    updates.status = settings.approvalChain === 'HR_ONLY' ? 'PENDING_HR' : 'PENDING_MANAGER';
    updates.submittedAt = new Date();
  } else if (action === 'approve') {
    const canApprove = await checkPermission('hr.leaves.approve');
    if (!canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!existing.status.startsWith('PENDING_')) {
      return NextResponse.json({ error: 'Request is not pending' }, { status: 400 });
    }
    const next = nextStatus(existing.status, settings.approvalChain);
    updates.status = next;
    const now = new Date();
    if (existing.status === 'PENDING_MANAGER') {
      updates.managerApprovedAt = now;
      updates.managerApprovedById = session.sub;
    } else if (existing.status === 'PENDING_HR') {
      updates.hrApprovedAt = now;
      updates.hrApprovedById = session.sub;
    } else if (existing.status === 'PENDING_CEO') {
      updates.ceoApprovedAt = now;
      updates.ceoApprovedById = session.sub;
    }
  } else if (action === 'reject') {
    const canApprove = await checkPermission('hr.leaves.approve');
    if (!canApprove) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    updates.status = 'REJECTED';
    updates.rejectedAt = new Date();
    updates.rejectedById = session.sub;
    updates.rejectReason = reason ?? null;
  }

  const updated = await prisma.leaveRequest.update({ where: { id }, data: updates });

  // On final APPROVED, refresh cached balance so dashboards reflect it.
  if (updated.status === 'APPROVED') {
    const year = updated.startDate.getFullYear();
    await refreshLeaveBalanceCache(updated.employeeId, updated.leaveTypeId, year).catch((e) => {
      logger.warn({ e, id }, '[LeaveRequest] Balance cache refresh failed');
    });
  }

  logger.info({ id, action, newStatus: updated.status }, '[LeaveRequest] Action processed');
  return NextResponse.json(updated);
}
