import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { syncMirStockIn } from '@/lib/services/qc/mir-stock-sync.service';

export const dynamic = 'force-dynamic';

function computeReceiptStatus(items: {
  orderedQty: number;
  receivedQty: number;
  inspectionResult: string;
}[]): string {
  if (items.length === 0) return 'In Progress';

  const allAccepted = items.every(i => i.inspectionResult === 'Accepted');
  const allRejected = items.every(i => i.inspectionResult === 'Rejected');
  const allReceived = items.every(i => i.receivedQty >= i.orderedQty);
  const anyReceived = items.some(i => i.receivedQty > 0);
  const anyInspected = items.some(i => i.inspectionResult !== 'Pending');

  if (allAccepted && allReceived) return 'Received and Accepted';
  if (allRejected && anyReceived) return 'Rejected';
  if (anyInspected) return 'Partially Accepted';
  if (anyReceived) return 'Partially Received';
  return 'In Progress';
}

// PATCH - Update receipt item (receive quantity, quality inspection)
export async function PATCH(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      itemId,
      receivedQty,
      acceptedQty,
      rejectedQty,
      qualityStatus,
      surfaceCondition,
      surfaceNotes,
      dimensionStatus,
      dimensionNotes,
      thicknessStatus,
      thicknessMeasured,
      thicknessNotes,
      specsCompliance,
      specsNotes,
      mtcAvailable,
      mtcNumber,
      mtcFilePath,
      heatNumber,
      batchNumber,
      inspectionResult,
      rejectionReason,
      remarks,
    } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    const parsedReceivedQty = receivedQty !== undefined ? parseFloat(receivedQty) : undefined;
    const parsedAcceptedQty = acceptedQty !== undefined ? parseFloat(acceptedQty) : undefined;

    if (parsedReceivedQty !== undefined && !isNaN(parsedReceivedQty)) updateData.receivedQty = parsedReceivedQty;
    if (parsedAcceptedQty !== undefined && !isNaN(parsedAcceptedQty)) updateData.acceptedQty = parsedAcceptedQty;

    // Auto-compute rejectedQty: if not provided or empty, derive from received - accepted
    if (rejectedQty !== undefined && rejectedQty !== '' && !isNaN(parseFloat(rejectedQty))) {
      updateData.rejectedQty = parseFloat(rejectedQty);
    } else if (parsedAcceptedQty !== undefined && !isNaN(parsedAcceptedQty)) {
      const rec = parsedReceivedQty ?? 0;
      updateData.rejectedQty = Math.max(0, rec - parsedAcceptedQty);
    }

    if (qualityStatus) updateData.qualityStatus = qualityStatus;

    if (surfaceCondition !== undefined) updateData.surfaceCondition = surfaceCondition;
    if (surfaceNotes !== undefined) updateData.surfaceNotes = surfaceNotes;
    if (dimensionStatus !== undefined) updateData.dimensionStatus = dimensionStatus;
    if (dimensionNotes !== undefined) updateData.dimensionNotes = dimensionNotes;
    if (thicknessStatus !== undefined) updateData.thicknessStatus = thicknessStatus;
    if (thicknessMeasured !== undefined) updateData.thicknessMeasured = thicknessMeasured;
    if (thicknessNotes !== undefined) updateData.thicknessNotes = thicknessNotes;
    if (specsCompliance !== undefined) updateData.specsCompliance = specsCompliance;
    if (specsNotes !== undefined) updateData.specsNotes = specsNotes;
    if (mtcAvailable !== undefined) updateData.mtcAvailable = mtcAvailable;
    if (mtcNumber !== undefined) updateData.mtcNumber = mtcNumber;
    if (mtcFilePath !== undefined) updateData.mtcFilePath = mtcFilePath;
    if (heatNumber !== undefined) updateData.heatNumber = heatNumber;
    if (batchNumber !== undefined) updateData.batchNumber = batchNumber;
    if (inspectionResult) updateData.inspectionResult = inspectionResult;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (remarks !== undefined) updateData.remarks = remarks;

    // Auto-fill passing conditions when accepted
    if (inspectionResult === 'Accepted') {
      updateData.qualityStatus = 'Accepted';
      if (!surfaceCondition) updateData.surfaceCondition = 'Good';
      if (!dimensionStatus) updateData.dimensionStatus = 'Within Tolerance';
      if (!thicknessStatus) updateData.thicknessStatus = 'OK';
      if (!specsCompliance) updateData.specsCompliance = 'Compliant';
    }

    const item = await prisma.materialInspectionReceiptItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        attachments: {
          include: {
            uploader: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Recompute and update receipt status
    const allItems = await prisma.materialInspectionReceiptItem.findMany({
      where: { receiptId: item.receiptId },
      select: { orderedQty: true, receivedQty: true, inspectionResult: true },
    });

    const newStatus = computeReceiptStatus(allItems);

    // Auto-advance workflow from Draft → Inspected when all items have been inspected
    const allInspected = allItems.length > 0 && allItems.every(i => i.inspectionResult !== 'Pending');
    const receiptMeta = allInspected
      ? await prisma.materialInspectionReceipt.findUnique({
          where: { id: item.receiptId },
          select: { workflowStatus: true },
        })
      : null;

    const shouldAutoAdvance =
      allInspected &&
      (receiptMeta?.workflowStatus === 'Draft' || receiptMeta?.workflowStatus === null);

    await prisma.materialInspectionReceipt.update({
      where: { id: item.receiptId },
      data: {
        status: newStatus,
        ...(shouldAutoAdvance && {
          workflowStatus: 'Inspected',
          submittedAt: new Date(),
          submittedById: session.sub,
        }),
      },
    });

    if (shouldAutoAdvance) {
      syncMirStockIn(item.receiptId, session.sub).catch(err =>
        logger.error({ err, mirId: item.receiptId }, '[MIR StockSync] Auto-advance stock-in failed'),
      );
    }

    return NextResponse.json({ ...item, _receiptAutoAdvanced: shouldAutoAdvance });
  } catch (error) {
    logger.error({ error }, 'Error updating receipt item');
    return NextResponse.json(
      { error: 'Failed to update receipt item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a receipt item
export async function DELETE(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      );
    }

    const deletedItem = await prisma.materialInspectionReceiptItem.delete({
      where: { id: itemId },
      select: { receiptId: true },
    });

    // Recompute receipt status after deletion
    const remaining = await prisma.materialInspectionReceiptItem.findMany({
      where: { receiptId: deletedItem.receiptId },
      select: { orderedQty: true, receivedQty: true, inspectionResult: true },
    });
    const newStatus = computeReceiptStatus(remaining);
    await prisma.materialInspectionReceipt.update({
      where: { id: deletedItem.receiptId },
      data: { status: newStatus },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting receipt item');
    return NextResponse.json(
      { error: 'Failed to delete receipt item' },
      { status: 500 }
    );
  }
}
