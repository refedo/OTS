/**
 * INV Stock Service
 * Core inventory transaction logic — stock-in, issue, return, adjustment.
 * All operations are called inside a Prisma $transaction to ensure atomicity.
 */

import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { logActivity } from '@/lib/api-utils';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockInParams {
  warehouseId: string;
  itemId: string;
  qty: number;
  referenceType: string;   // "MIR", "RETURN", "ADJUSTMENT"
  referenceId?: string;
  referenceNo?: string;
  performedById: string;
  notes?: string;
}

export interface IssueStockParams {
  warehouseId: string;
  itemId: string;
  qty: number;
  referenceId: string;     // mirOutId
  referenceNo: string;     // mirOutNumber
  projectId?: string | null;
  locationId?: string | null;
  performedById: string;
}

export interface ReturnStockParams {
  warehouseId: string;
  itemId: string;
  qty: number;
  returnId: string;
  returnNo: string;
  performedById: string;
  notes?: string;
}

export interface AdjustStockParams {
  warehouseId: string;
  itemId: string;
  physicalQty: number;
  systemQty: number;
  adjustmentId: string;
  adjustmentNo: string;
  authorizedById: string;
  reason: string;
}

// ─── Stock In ─────────────────────────────────────────────────────────────────

/**
 * Record stock entering a warehouse (from MIR receipt or return).
 * Must be called inside a prisma.$transaction.
 */
export async function stockIn(
  tx: Prisma.TransactionClient,
  params: StockInParams
): Promise<number> {
  const { warehouseId, itemId, qty, referenceType, referenceId, referenceNo, performedById, notes } = params;

  // Upsert the stock balance
  const existing = await tx.invStockBalance.findUnique({
    where: { warehouseId_itemId: { warehouseId, itemId } },
    select: { id: true, quantity: true },
  });

  let newBalance: number;

  if (existing) {
    newBalance = existing.quantity + qty;
    await tx.invStockBalance.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { quantity: newBalance },
    });
  } else {
    newBalance = qty;
    await tx.invStockBalance.create({
      data: {
        id: uuidv4(),
        warehouseId,
        itemId,
        quantity: newBalance,
      },
    });
  }

  // Write immutable ledger entry
  await tx.invStockLedger.create({
    data: {
      id: uuidv4(),
      warehouseId,
      itemId,
      direction: 'IN',
      movementType: 'STOCK_IN',
      quantity: qty,
      balanceAfter: newBalance,
      referenceType: referenceType ?? null,
      referenceId: referenceId ?? null,
      referenceNo: referenceNo ?? null,
      performedById,
      notes: notes ?? null,
    },
  });

  logger.info({ warehouseId, itemId, qty, newBalance, referenceType }, '[INV] Stock in recorded');
  return newBalance;
}

// ─── Issue Stock ──────────────────────────────────────────────────────────────

/**
 * Deduct stock from warehouse when issuing to production.
 * Must be called inside a prisma.$transaction.
 * Throws if insufficient balance.
 */
export async function issueStock(
  tx: Prisma.TransactionClient,
  params: IssueStockParams
): Promise<{ newBalance: number; isLowStock: boolean; minStockLevel: number }> {
  const { warehouseId, itemId, qty, referenceId, referenceNo, projectId, locationId, performedById } = params;

  // Re-read balance inside transaction (row-level consistency)
  const balance = await tx.invStockBalance.findUnique({
    where: { warehouseId_itemId: { warehouseId, itemId } },
    select: { quantity: true },
  });

  const currentQty = balance?.quantity ?? 0;

  if (currentQty < qty) {
    throw new InsufficientStockError(currentQty, qty, warehouseId, itemId);
  }

  const newBalance = currentQty - qty;

  // Decrement balance
  if (balance) {
    await tx.invStockBalance.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { quantity: newBalance },
    });
  } else {
    await tx.invStockBalance.create({
      data: { id: uuidv4(), warehouseId, itemId, quantity: newBalance },
    });
  }

  // Write ledger entry
  await tx.invStockLedger.create({
    data: {
      id: uuidv4(),
      warehouseId,
      itemId,
      direction: 'OUT',
      movementType: 'ISSUE',
      quantity: qty,
      balanceAfter: newBalance,
      referenceType: 'MIR_OUT',
      referenceId: referenceId,
      referenceNo: referenceNo,
      projectId: projectId ?? null,
      locationId: locationId ?? null,
      mirOutId: referenceId,
      performedById,
    },
  });

  // Check low stock
  const item = await tx.invItem.findUnique({
    where: { id: itemId },
    select: { minStockLevel: true },
  });
  const minStockLevel = item?.minStockLevel ?? 0;
  const isLowStock = newBalance < minStockLevel;

  if (isLowStock) {
    logger.warn({ warehouseId, itemId, newBalance, minStockLevel }, '[INV] Low stock alert triggered');
  }

  logger.info({ warehouseId, itemId, qty, newBalance }, '[INV] Stock issued');
  return { newBalance, isLowStock, minStockLevel };
}

// ─── Return Stock ──────────────────────────────────────────────────────────────

/**
 * Add returned stock back to a warehouse.
 * Must be called inside a prisma.$transaction.
 */
export async function returnStock(
  tx: Prisma.TransactionClient,
  params: ReturnStockParams
): Promise<number> {
  const { warehouseId, itemId, qty, returnId, returnNo, performedById, notes } = params;

  const existing = await tx.invStockBalance.findUnique({
    where: { warehouseId_itemId: { warehouseId, itemId } },
    select: { quantity: true },
  });

  const newBalance = (existing?.quantity ?? 0) + qty;

  if (existing) {
    await tx.invStockBalance.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { quantity: newBalance },
    });
  } else {
    await tx.invStockBalance.create({
      data: { id: uuidv4(), warehouseId, itemId, quantity: newBalance },
    });
  }

  await tx.invStockLedger.create({
    data: {
      id: uuidv4(),
      warehouseId,
      itemId,
      direction: 'IN',
      movementType: 'RETURN',
      quantity: qty,
      balanceAfter: newBalance,
      referenceType: 'RETURN',
      referenceId: returnId,
      referenceNo: returnNo,
      returnId: returnId,
      performedById,
      notes: notes ?? null,
    },
  });

  logger.info({ warehouseId, itemId, qty, newBalance }, '[INV] Return stock recorded');
  return newBalance;
}

// ─── Adjust Stock ─────────────────────────────────────────────────────────────

/**
 * Set stock balance to physical count (up or down).
 * Must be called inside a prisma.$transaction.
 */
export async function adjustStock(
  tx: Prisma.TransactionClient,
  params: AdjustStockParams
): Promise<number> {
  const { warehouseId, itemId, physicalQty, systemQty, adjustmentId, adjustmentNo, authorizedById, reason } = params;

  const variance = physicalQty - systemQty;

  // Set balance to physical count
  const existing = await tx.invStockBalance.findUnique({
    where: { warehouseId_itemId: { warehouseId, itemId } },
    select: { id: true },
  });

  if (existing) {
    await tx.invStockBalance.update({
      where: { warehouseId_itemId: { warehouseId, itemId } },
      data: { quantity: physicalQty },
    });
  } else {
    await tx.invStockBalance.create({
      data: { id: uuidv4(), warehouseId, itemId, quantity: physicalQty },
    });
  }

  // Write ledger — direction is IN if we gained stock, OUT if lost
  await tx.invStockLedger.create({
    data: {
      id: uuidv4(),
      warehouseId,
      itemId,
      direction: variance >= 0 ? 'IN' : 'OUT',
      movementType: 'ADJUSTMENT',
      quantity: Math.abs(variance),
      balanceAfter: physicalQty,
      referenceType: 'ADJUSTMENT',
      referenceId: adjustmentId,
      referenceNo: adjustmentNo,
      performedById: authorizedById,
      notes: reason,
    },
  });

  logger.info({ warehouseId, itemId, physicalQty, systemQty, variance }, '[INV] Stock adjusted');
  return physicalQty;
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export class InsufficientStockError extends Error {
  constructor(
    public readonly available: number,
    public readonly requested: number,
    public readonly warehouseId: string,
    public readonly itemId: string
  ) {
    super(`Insufficient stock: requested ${requested}, available ${available}`);
    this.name = 'InsufficientStockError';
  }
}
