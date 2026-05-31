/**
 * POST /api/qc/material-receipts/workflow
 *
 * Handles workflow state transitions for Material Inspection Receipts.
 *
 * Transitions:
 *   Draft      → Inspected  (action: 'submit'  — all items must be inspected)
 *   Inspected  → Reviewed   (action: 'review')
 *   Inspected|Reviewed → Approved (action: 'approve')
 *   Inspected|Reviewed → Rejected (action: 'reject')
 *
 * Designated personnel are notified at each transition via the NotificationService.
 * Recipients are resolved by PBAC permission (quality.mir.review / quality.mir.approve).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';
import { syncMirStockIn } from '@/lib/services/qc/mir-stock-sync.service';
import {
  resolvePermissionsFromData,
  parseCustomPermissions,
} from '@/lib/services/permission-resolution.service';

export const dynamic = 'force-dynamic';

const workflowSchema = z.object({
  receiptId: z.string().min(1),
  action: z.enum(['submit', 'review', 'approve', 'reject']),
  notes: z.string().optional(),
});

// Resolve all active users that hold the given PBAC permission
async function getUsersWithPermission(permission: string): Promise<{ id: string; name: string }[]> {
  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      name: true,
      isAdmin: true,
      role: { select: { permissions: true, restrictedModules: true } },
      customPermissions: true,
    },
  });

  return users.filter(u => {
    const rolePermissions = (u.role.permissions as string[]) ?? [];
    const customPerms = parseCustomPermissions(u.customPermissions);
    const restrictedModules = (u.role.restrictedModules as string[]) ?? [];
    const resolved = resolvePermissionsFromData({
      isAdmin: u.isAdmin,
      rolePermissions,
      customPermissions: customPerms,
      restrictedModules,
    });
    return resolved.includes(permission);
  });
}

export const POST = withApiContext(async (req: NextRequest, session) => {
  const body: unknown = await req.json();
  const parsed = workflowSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { receiptId, action, notes } = parsed.data;
  const userId = session!.userId;

  // Fetch the receipt with items + inspector/submitter IDs for notifications
  const receipt = await prisma.materialInspectionReceipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      receiptNumber: true,
      workflowStatus: true,
      inspectorId: true,
      submittedById: true,
      items: {
        select: { id: true, inspectionResult: true },
      },
    },
  });

  if (!receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
  }

  const now = new Date();

  // --- Validate transition and build update payload ---

  if (action === 'submit') {
    if (receipt.workflowStatus !== 'Draft') {
      return NextResponse.json(
        {
          error: `Cannot submit: receipt is currently '${receipt.workflowStatus}'. Expected 'Draft'.`,
        },
        { status: 422 },
      );
    }

    const hasPendingItems = receipt.items.some(
      (item: { id: string; inspectionResult: string }) =>
        item.inspectionResult === 'Pending',
    );
    if (hasPendingItems) {
      return NextResponse.json(
        { error: 'Cannot submit: all items must be inspected before submitting.' },
        { status: 422 },
      );
    }

    const updated = await prisma.materialInspectionReceipt.update({
      where: { id: receiptId },
      data: {
        workflowStatus: 'Inspected',
        submittedAt: now,
        submittedById: userId,
      },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        inspector: { select: { id: true, name: true, email: true } },
        submittedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: true,
        evaluation: { select: { id: true } },
      },
    });

    logger.info(
      { receiptId, receiptNumber: receipt.receiptNumber, action, userId },
      '[MIR Workflow] Receipt submitted for inspection review',
    );

    // Post accepted quantities into inventory stock
    syncMirStockIn(receiptId, userId).catch(err =>
      logger.error({ err, receiptId }, '[MIR StockSync] Submit stock-in failed'),
    );

    // Notify all users with quality.mir.review permission
    getUsersWithPermission('quality.mir.review').then(reviewers => {
      reviewers.forEach(r =>
        NotificationService.createNotification({
          userId: r.id,
          type: 'APPROVAL_REQUIRED',
          title: 'MIR Ready for Review',
          message: `MIR ${receipt.receiptNumber} has been submitted and requires your QC review.`,
          relatedEntityType: 'MaterialInspectionReceipt',
          relatedEntityId: receiptId,
        }).catch(err => logger.error({ err, reviewerId: r.id }, '[MIR] Failed to notify reviewer')),
      );
    }).catch(err => logger.error({ err }, '[MIR] Failed to fetch reviewers for submit notification'));

    return NextResponse.json(updated);
  }

  if (action === 'review') {
    if (receipt.workflowStatus !== 'Inspected') {
      return NextResponse.json(
        {
          error: `Cannot review: receipt is currently '${receipt.workflowStatus}'. Expected 'Inspected'.`,
        },
        { status: 422 },
      );
    }

    const updated = await prisma.materialInspectionReceipt.update({
      where: { id: receiptId },
      data: {
        workflowStatus: 'Reviewed',
        reviewedAt: now,
        reviewedById: userId,
        reviewNotes: notes ?? null,
      },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        inspector: { select: { id: true, name: true, email: true } },
        submittedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: true,
        evaluation: { select: { id: true } },
      },
    });

    logger.info(
      { receiptId, receiptNumber: receipt.receiptNumber, action, userId },
      '[MIR Workflow] Receipt reviewed',
    );

    // Notify all users with quality.mir.approve permission
    getUsersWithPermission('quality.mir.approve').then(approvers => {
      approvers.forEach(a =>
        NotificationService.createNotification({
          userId: a.id,
          type: 'APPROVAL_REQUIRED',
          title: 'MIR Awaiting Final Approval',
          message: `MIR ${receipt.receiptNumber} has been reviewed and awaits your final approval.`,
          relatedEntityType: 'MaterialInspectionReceipt',
          relatedEntityId: receiptId,
        }).catch(err => logger.error({ err, approverId: a.id }, '[MIR] Failed to notify approver')),
      );
    }).catch(err => logger.error({ err }, '[MIR] Failed to fetch approvers for review notification'));

    return NextResponse.json(updated);
  }

  if (action === 'approve') {
    if (!['Inspected', 'Reviewed'].includes(receipt.workflowStatus)) {
      return NextResponse.json(
        {
          error: `Cannot approve: receipt is currently '${receipt.workflowStatus}'. Expected 'Inspected' or 'Reviewed'.`,
        },
        { status: 422 },
      );
    }

    const updated = await prisma.materialInspectionReceipt.update({
      where: { id: receiptId },
      data: {
        workflowStatus: 'Approved',
        approvedAt: now,
        approvedById: userId,
        approvalNotes: notes ?? null,
      },
      include: {
        project: { select: { id: true, projectNumber: true, name: true } },
        inspector: { select: { id: true, name: true, email: true } },
        submittedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: true,
        evaluation: { select: { id: true } },
      },
    });

    logger.info(
      { receiptId, receiptNumber: receipt.receiptNumber, action, userId },
      '[MIR Workflow] Receipt approved',
    );

    // Notify inspector and submitter (deduplicated)
    const notifyIds = [...new Set([receipt.inspectorId, receipt.submittedById].filter((id): id is string => !!id))];
    notifyIds.forEach(uid =>
      NotificationService.createNotification({
        userId: uid,
        type: 'APPROVED',
        title: 'MIR Approved',
        message: `MIR ${receipt.receiptNumber} has been approved.${notes ? ` Note: ${notes}` : ''}`,
        relatedEntityType: 'MaterialInspectionReceipt',
        relatedEntityId: receiptId,
      }).catch(err => logger.error({ err, uid }, '[MIR] Failed to send approval notification')),
    );

    return NextResponse.json(updated);
  }

  // action === 'reject'
  if (!['Inspected', 'Reviewed'].includes(receipt.workflowStatus)) {
    return NextResponse.json(
      {
        error: `Cannot reject: receipt is currently '${receipt.workflowStatus}'. Expected 'Inspected' or 'Reviewed'.`,
      },
      { status: 422 },
    );
  }

  const updated = await prisma.materialInspectionReceipt.update({
    where: { id: receiptId },
    data: {
      workflowStatus: 'Rejected',
      status: 'Rejected',
      approvedAt: now,
      approvedById: userId,
      approvalNotes: notes ?? null,
    },
    include: {
      project: { select: { id: true, projectNumber: true, name: true } },
      inspector: { select: { id: true, name: true, email: true } },
      submittedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      items: true,
      evaluation: { select: { id: true } },
    },
  });

  logger.info(
    { receiptId, receiptNumber: receipt.receiptNumber, action, userId },
    '[MIR Workflow] Receipt rejected',
  );

  // Notify inspector and submitter (deduplicated)
  const notifyIds = [...new Set([receipt.inspectorId, receipt.submittedById].filter((id): id is string => !!id))];
  notifyIds.forEach(uid =>
    NotificationService.createNotification({
      userId: uid,
      type: 'REJECTED',
      title: 'MIR Rejected',
      message: `MIR ${receipt.receiptNumber} has been rejected.${notes ? ` Reason: ${notes}` : ''}`,
      relatedEntityType: 'MaterialInspectionReceipt',
      relatedEntityId: receiptId,
    }).catch(err => logger.error({ err, uid }, '[MIR] Failed to send rejection notification')),
  );

  return NextResponse.json(updated);
});
