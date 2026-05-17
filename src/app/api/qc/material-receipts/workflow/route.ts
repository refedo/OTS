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
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const workflowSchema = z.object({
  receiptId: z.string().min(1),
  action: z.enum(['submit', 'review', 'approve', 'reject']),
  notes: z.string().optional(),
});

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

  // Fetch the receipt with its items to validate state
  const receipt = await prisma.materialInspectionReceipt.findUnique({
    where: { id: receiptId },
    select: {
      id: true,
      receiptNumber: true,
      workflowStatus: true,
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
      },
    });

    logger.info(
      { receiptId, receiptNumber: receipt.receiptNumber, action, userId },
      '[MIR Workflow] Receipt submitted for inspection review',
    );

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
      },
    });

    logger.info(
      { receiptId, receiptNumber: receipt.receiptNumber, action, userId },
      '[MIR Workflow] Receipt reviewed',
    );

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
      },
    });

    logger.info(
      { receiptId, receiptNumber: receipt.receiptNumber, action, userId },
      '[MIR Workflow] Receipt approved',
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
    },
  });

  logger.info(
    { receiptId, receiptNumber: receipt.receiptNumber, action, userId },
    '[MIR Workflow] Receipt rejected',
  );

  return NextResponse.json(updated);
});
