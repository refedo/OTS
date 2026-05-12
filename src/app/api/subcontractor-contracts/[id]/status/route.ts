import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { VALID_TRANSITIONS } from '@/lib/services/subcontractor-contract.service';

const statusSchema = z.object({
  action: z.enum(['submit', 'approve', 'reject', 'activate', 'suspend', 'complete', 'cancel']),
  reason: z.string().optional().nullable(),
});

const ACTION_TO_STATUS: Record<string, string> = {
  submit: 'SUBMITTED',
  approve: 'APPROVED',
  reject: 'DRAFT',
  activate: 'ACTIVE',
  suspend: 'SUSPENDED',
  complete: 'COMPLETED',
  cancel: 'CANCELLED',
};

export const POST = withApiContext(async (req: NextRequest, session, context) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = context?.params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  const { action, reason } = parsed.data;

  // Approve/reject requires approve permission; all other status changes require edit permission
  const requiredPerm = (action === 'approve' || action === 'reject') ? 'subcontractors.approve' : 'subcontractors.edit';
  if (!(await checkPermission(requiredPerm))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const newStatus = ACTION_TO_STATUS[action];

  try {
    const contract = await prisma.subcontractorContract.findUnique({ where: { id, deletedAt: null } });
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

    const allowed = VALID_TRANSITIONS[contract.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json({
        error: `Cannot transition from ${contract.status} to ${newStatus}`,
      }, { status: 409 });
    }

    const now = new Date();
    const timestampFields: Record<string, Date | null> = {};
    if (action === 'submit') timestampFields.submittedAt = now;
    if (action === 'approve') { timestampFields.approvedAt = now; }
    if (action === 'activate') timestampFields.activatedAt = now;
    if (action === 'suspend') timestampFields.suspendedAt = now;
    if (action === 'complete') timestampFields.completedAt = now;

    const updated = await prisma.subcontractorContract.update({
      where: { id },
      data: {
        status: newStatus,
        ...(action === 'approve' ? { approvedById: session.userId } : {}),
        ...(action === 'reject' ? { approvedById: null, approvedAt: null, submittedAt: null } : {}),
        ...timestampFields,
        notes: reason
          ? `${contract.notes ?? ''}\n[${action.toUpperCase()} by ${session.name} on ${now.toISOString().split('T')[0]}]: ${reason}`.trim()
          : contract.notes,
        updatedById: session.userId,
      },
    });

    logger.info({ id, action, newStatus, userId: session.userId }, '[SC Contracts] Status updated');
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error, id, action }, '[SC Contracts] Failed to update status');
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
});
