/**
 * MIR Stock Sync Service
 * Posts accepted quantities from a Material Inspection Receipt into inventory
 * when the receipt is submitted (Draft → Inspected).
 * Idempotent: skips MIRs that already have ledger entries.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { stockIn } from '@/lib/services/inv/inv-stock.service';

export async function syncMirStockIn(mirId: string, performedById: string): Promise<void> {
  // Idempotency: skip if already synced
  const alreadySynced = await prisma.invStockLedger.findFirst({
    where: { referenceType: 'MIR', referenceId: mirId },
    select: { id: true },
  });
  if (alreadySynced) {
    logger.info({ mirId }, '[MIR StockSync] Already synced, skipping');
    return;
  }

  const receipt = await prisma.materialInspectionReceipt.findUnique({
    where: { id: mirId },
    select: {
      id: true,
      receiptNumber: true,
      dolibarrPoRef: true,
      items: {
        select: { dolibarrProductId: true, acceptedQty: true },
      },
    },
  });

  if (!receipt) {
    logger.warn({ mirId }, '[MIR StockSync] Receipt not found');
    return;
  }

  // Extract siteId from PO ref: "HU-PO-2605-1753" → "HU"
  const siteId = receipt.dolibarrPoRef.split('-PO-')[0];
  if (!siteId) {
    logger.warn({ mirId, dolibarrPoRef: receipt.dolibarrPoRef }, '[MIR StockSync] Cannot extract siteId from PO ref');
    return;
  }

  let posted = 0;
  let skipped = 0;

  for (const item of receipt.items) {
    if (!item.dolibarrProductId || item.acceptedQty <= 0) {
      skipped++;
      continue;
    }

    const dolibarrId = parseInt(item.dolibarrProductId, 10);
    if (isNaN(dolibarrId)) {
      logger.warn({ mirId, dolibarrProductId: item.dolibarrProductId }, '[MIR StockSync] Non-numeric dolibarrProductId, skipping');
      skipped++;
      continue;
    }

    const invItem = await prisma.invItem.findFirst({
      where: { dolibarrId, deletedAt: null },
      select: { id: true, defaultWhType: true },
    });

    if (!invItem) {
      logger.warn({ mirId, dolibarrId }, '[MIR StockSync] No InvItem catalog match, skipping');
      skipped++;
      continue;
    }

    const warehouse = await prisma.invWarehouse.findFirst({
      where: { siteId, type: invItem.defaultWhType, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!warehouse) {
      logger.warn({ mirId, siteId, whType: invItem.defaultWhType }, '[MIR StockSync] No matching warehouse, skipping');
      skipped++;
      continue;
    }

    try {
      await prisma.$transaction(async (tx: Parameters<typeof stockIn>[0]) => {
        await stockIn(tx, {
          warehouseId: warehouse.id,
          itemId: invItem.id,
          qty: item.acceptedQty,
          referenceType: 'MIR',
          referenceId: mirId,
          referenceNo: receipt.receiptNumber,
          performedById,
        });
      });
      posted++;
    } catch (err) {
      logger.error({ err, mirId, invItemId: invItem.id }, '[MIR StockSync] Failed to post stock-in for item');
      skipped++;
    }
  }

  logger.info({ mirId, receiptNumber: receipt.receiptNumber, posted, skipped }, '[MIR StockSync] Sync complete');
}

/**
 * Retroactive backfill: processes all received MIRs that have no inventory
 * ledger entries yet. Called once on server startup — safe to run repeatedly.
 */
export async function backfillMirStockIn(): Promise<void> {
  const pending = await prisma.materialInspectionReceipt.findMany({
    where: {
      workflowStatus: { in: ['Inspected', 'Reviewed', 'Approved'] },
      status: { in: ['Received and Accepted', 'Partially Accepted'] },
    },
    select: { id: true, receiptNumber: true, inspectorId: true },
  });

  if (pending.length === 0) {
    logger.info({}, '[Startup] MIR stock backfill: nothing to process');
    return;
  }

  logger.info({ count: pending.length }, '[Startup] MIR stock backfill: starting');

  let processed = 0;
  let alreadySynced = 0;

  for (const mir of pending) {
    const hasSyncEntry = await prisma.invStockLedger.findFirst({
      where: { referenceType: 'MIR', referenceId: mir.id },
      select: { id: true },
    });

    if (hasSyncEntry) {
      alreadySynced++;
      continue;
    }

    await syncMirStockIn(mir.id, mir.inspectorId).catch(err =>
      logger.error({ err, mirId: mir.id, receiptNumber: mir.receiptNumber }, '[Startup] MIR backfill stock-in failed'),
    );
    processed++;
  }

  logger.info({ processed, alreadySynced }, '[Startup] MIR stock backfill complete');
}
