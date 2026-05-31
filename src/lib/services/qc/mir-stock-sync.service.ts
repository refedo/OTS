/**
 * MIR Stock Sync Service
 * Posts accepted quantities from a Material Inspection Receipt into inventory
 * when the receipt is submitted (Draft → Inspected).
 *
 * Per-item idempotent: skips individual items that already have a ledger entry
 * for this MIR, so partially-synced MIRs can be retried safely.
 *
 * Auto-resolution: when an InvItem with the matching dolibarrId is not found,
 * the service looks up the product in the dolibarr_products mirror and either
 * links an existing InvItem by code or creates a new one with safe defaults.
 */

import { v4 as uuidv4 } from 'uuid';
import type { InvItemCategory, InvWarehouseType } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { stockIn } from '@/lib/services/inv/inv-stock.service';

type ResolvedItem = { id: string; defaultWhType: InvWarehouseType };

export function mapMaterialCategory(cat: string | null | undefined): InvItemCategory {
  switch (cat) {
    case 'SHEET':
    case 'PLATE':
      return 'SHEET';
    case 'PIPE':
      return 'PIPE';
    case 'PROFILE_H':
    case 'PROFILE_I':
    case 'PROFILE_HEA':
    case 'PROFILE_HEB':
    case 'PROFILE_IPE':
    case 'PROFILE_C':
    case 'PROFILE_ANGLE':
    case 'FLAT_BAR':
    case 'ROUND_BAR':
      return 'STRUCTURAL_STEEL';
    case 'BOLT':
    case 'NUT':
      return 'FASTENER';
    case 'WELDING_ELECTRODE':
    case 'WELDING_WIRE_FLUX':
    case 'WELDING_PPE':
    case 'GAS_CYLINDER':
      return 'CONSUMABLE';
    case 'PAINT':
      return 'PAINT';
    default:
      return 'OTHER';
  }
}

/**
 * Look up the Dolibarr product mirror for a given dolibarrId and return a
 * linked or newly-created InvItem. Returns null if the product isn't in the
 * mirror (Dolibarr sync has never run) or if an error occurs.
 */
async function resolveInvItemFromDolibarr(
  dolibarrId: number,
  performedById: string,
): Promise<ResolvedItem | null> {
  try {
    const rows = await prisma.$queryRaw<{ ref: string; label: string; material_category: string | null; item_class: string | null }[]>`
      SELECT ref, label, material_category, item_class FROM dolibarr_products
      WHERE dolibarr_id = ${dolibarrId} AND is_active = 1 LIMIT 1
    `;
    const product = rows[0];
    if (!product) return null;

    const category = mapMaterialCategory(product.material_category);
    const defaultWhType: InvWarehouseType =
      product.item_class === 'CONSUMABLE' ? 'CONSUMABLE' : 'RAW_MATERIAL';

    // Link an existing InvItem whose code matches the Dolibarr product ref
    const existingByCode = await prisma.invItem.findFirst({
      where: { code: product.ref, deletedAt: null },
      select: { id: true, defaultWhType: true, category: true },
    });

    if (existingByCode) {
      await prisma.invItem.update({
        where: { id: existingByCode.id },
        data: {
          dolibarrId,
          ...(existingByCode.category === 'OTHER' && category !== 'OTHER' ? { category } : {}),
        },
      });
      logger.info(
        { dolibarrId, invItemId: existingByCode.id, code: product.ref },
        '[MIR StockSync] Linked existing InvItem by code',
      );
      return { id: existingByCode.id, defaultWhType: existingByCode.defaultWhType };
    }

    // Create a new InvItem with mapped category
    const id = uuidv4();
    await prisma.invItem.create({
      data: {
        id,
        code: product.ref,
        name: product.label.slice(0, 150),
        unit: 'PCS',
        category,
        defaultWhType,
        dolibarrId,
        createdById: performedById,
      },
    });
    logger.info(
      { dolibarrId, invItemId: id, code: product.ref },
      '[MIR StockSync] Created InvItem from Dolibarr product',
    );
    return { id, defaultWhType: 'RAW_MATERIAL' };
  } catch (err) {
    logger.warn({ err, dolibarrId }, '[MIR StockSync] Could not resolve InvItem from Dolibarr mirror');
    return null;
  }
}

export async function syncMirStockIn(
  mirId: string,
  performedById: string,
): Promise<{ posted: number; skipped: number }> {
  const receipt = await prisma.materialInspectionReceipt.findUnique({
    where: { id: mirId },
    select: {
      id: true,
      receiptNumber: true,
      dolibarrPoRef: true,
      targetSiteId: true,
      items: {
        select: { dolibarrProductId: true, acceptedQty: true, unitPrice: true },
      },
    },
  });

  if (!receipt) {
    logger.warn({ mirId }, '[MIR StockSync] Receipt not found');
    return { posted: 0, skipped: 0 };
  }

  // Use explicit targetSiteId if set; otherwise extract from PO ref: "HU-PO-2605-1753" → "HU"
  const extractedSiteId = receipt.dolibarrPoRef.split('-PO-')[0];
  const siteId = receipt.targetSiteId || extractedSiteId;
  if (!siteId) {
    logger.warn({ mirId, dolibarrPoRef: receipt.dolibarrPoRef }, '[MIR StockSync] Cannot extract siteId from PO ref');
    return { posted: 0, skipped: 0 };
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
      logger.warn(
        { mirId, dolibarrProductId: item.dolibarrProductId },
        '[MIR StockSync] Non-numeric dolibarrProductId, skipping',
      );
      skipped++;
      continue;
    }

    // Resolve InvItem — catalog lookup first, then fall back to Dolibarr mirror
    let invItem: ResolvedItem | null =
      await prisma.invItem.findFirst({
        where: { dolibarrId, deletedAt: null },
        select: { id: true, defaultWhType: true },
      });

    if (!invItem) {
      invItem = await resolveInvItemFromDolibarr(dolibarrId, performedById);
    }

    if (!invItem) {
      logger.warn({ mirId, dolibarrId }, '[MIR StockSync] No InvItem catalog match, skipping');
      skipped++;
      continue;
    }

    // Per-item idempotency: skip if this item already has a ledger entry for this MIR
    const alreadySynced = await prisma.invStockLedger.findFirst({
      where: { referenceType: 'MIR', referenceId: mirId, itemId: invItem.id },
      select: { id: true },
    });
    if (alreadySynced) {
      skipped++;
      continue;
    }

    let resolvedSiteId = siteId;
    let warehouse = await prisma.invWarehouse.findFirst({
      where: { siteId: resolvedSiteId, type: invItem.defaultWhType, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!warehouse) {
      // Try to resolve siteId via site sourceCodes aliases
      const allSites = await prisma.invSite.findMany({
        where: { isActive: true, deletedAt: null },
        select: { code: true, sourceCodes: true },
      });
      const mappedSite = allSites.find(s =>
        s.sourceCodes?.split(',').map(c => c.trim()).includes(siteId)
      );
      if (mappedSite) {
        resolvedSiteId = mappedSite.code;
        warehouse = await prisma.invWarehouse.findFirst({
          where: { siteId: resolvedSiteId, type: invItem.defaultWhType, isActive: true, deletedAt: null },
          select: { id: true },
        });
      }
    }

    if (!warehouse) {
      logger.warn(
        { mirId, siteId, resolvedSiteId, whType: invItem.defaultWhType },
        '[MIR StockSync] No matching warehouse, skipping',
      );
      skipped++;
      continue;
    }

    const warehouseId = warehouse.id;
    try {
      await prisma.$transaction(async (tx: Parameters<typeof stockIn>[0]) => {
        await stockIn(tx, {
          warehouseId,
          itemId: invItem!.id,
          qty: item.acceptedQty,
          referenceType: 'MIR',
          referenceId: mirId,
          referenceNo: receipt.receiptNumber,
          performedById,
          unitCost: item.unitPrice ? Number(item.unitPrice) : undefined,
        });
      });
      posted++;
    } catch (err) {
      logger.error({ err, mirId, invItemId: invItem.id }, '[MIR StockSync] Failed to post stock-in for item');
      skipped++;
    }
  }

  logger.info(
    { mirId, receiptNumber: receipt.receiptNumber, posted, skipped },
    '[MIR StockSync] Sync complete',
  );
  return { posted, skipped };
}

/**
 * Retroactive backfill: re-runs syncMirStockIn for all MIRs in a received
 * workflow state. Per-item idempotency inside syncMirStockIn prevents
 * double-posting items that were already synced.
 * Safe to call repeatedly — e.g. on server startup or via admin trigger.
 */
export async function backfillMirStockIn(): Promise<{ totalPosted: number; totalSkipped: number }> {
  const pending = await prisma.materialInspectionReceipt.findMany({
    where: {
      workflowStatus: { in: ['Inspected', 'Reviewed', 'Approved'] },
      status: { in: ['Received and Accepted', 'Partially Accepted'] },
    },
    select: { id: true, receiptNumber: true, inspectorId: true },
  });

  if (pending.length === 0) {
    logger.info({}, '[MIR Backfill] Nothing to process');
    return { totalPosted: 0, totalSkipped: 0 };
  }

  logger.info({ count: pending.length }, '[MIR Backfill] Starting');

  let totalPosted = 0;
  let totalSkipped = 0;

  for (const mir of pending) {
    const result = await syncMirStockIn(mir.id, mir.inspectorId).catch(err => {
      logger.error(
        { err, mirId: mir.id, receiptNumber: mir.receiptNumber },
        '[MIR Backfill] syncMirStockIn failed',
      );
      return { posted: 0, skipped: 0 };
    });
    totalPosted += result.posted;
    totalSkipped += result.skipped;
  }

  logger.info({ totalPosted, totalSkipped }, '[MIR Backfill] Complete');
  return { totalPosted, totalSkipped };
}
