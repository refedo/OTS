/**
 * Internal Stock-In Hook
 * Called by the MIR (Material Inspection Receipt) module when a receipt
 * transitions to status RECEIVED.
 * NOT a user-facing endpoint — called internally from the purchasing flow.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { stockIn } from '@/lib/services/inv/inv-stock.service';

const StockInSchema = z.object({
  mirId: z.string(),
  mirNo: z.string(),
  siteId: z.string().min(1).max(10),
  lines: z.array(z.object({
    itemId: z.string().uuid(),
    qty: z.number().positive(),
  })).min(1),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = StockInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { mirId, mirNo, siteId, lines } = parsed.data;

    const results = [];
    const errors = [];

    for (const line of lines) {
      try {
        // Get item to find defaultWhType
        const item = await prisma.invItem.findFirst({
          where: { id: line.itemId, deletedAt: null },
          select: { id: true, code: true, defaultWhType: true },
        });

        if (!item) {
          errors.push({ itemId: line.itemId, error: 'Item not found in INV catalog' });
          continue;
        }

        // Find correct warehouse for this factory + item type
        const warehouse = await prisma.invWarehouse.findFirst({
          where: {
            siteId,
            type: item.defaultWhType,
            isActive: true,
            deletedAt: null,
          },
          select: { id: true, code: true },
        });

        if (!warehouse) {
          errors.push({ itemId: line.itemId, error: `No active ${item.defaultWhType} warehouse found for site ${siteId}` });
          continue;
        }

        const newBalance = await prisma.$transaction(async tx => {
          return stockIn(tx, {
            warehouseId: warehouse.id,
            itemId: line.itemId,
            qty: line.qty,
            referenceType: 'MIR',
            referenceId: mirId,
            referenceNo: mirNo,
            performedById: session.userId,
          });
        });

        results.push({
          itemId: line.itemId,
          itemCode: item.code,
          warehouseId: warehouse.id,
          warehouseCode: warehouse.code,
          qty: line.qty,
          newBalance,
        });
      } catch (lineError) {
        logger.error({ lineError, itemId: line.itemId }, '[INV] Failed to stock-in line item');
        errors.push({ itemId: line.itemId, error: 'Failed to process stock-in' });
      }
    }

    logger.info({ mirId, mirNo, processed: results.length, errors: errors.length }, '[INV] Stock-in from MIR processed');
    return NextResponse.json({ processed: results, errors }, { status: errors.length > 0 && results.length === 0 ? 422 : 200 });
  } catch (error) {
    logger.error({ error }, '[INV] Internal stock-in hook failed');
    return NextResponse.json({ error: 'Stock-in failed' }, { status: 500 });
  }
}
