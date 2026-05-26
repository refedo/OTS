/**
 * Direct Stock Addition
 * For opening balance entry / migration from external systems (e.g. Dolibarr).
 * Requires inv.adjust permission. Creates a STOCK_IN ledger entry with reference type DIRECT.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { stockIn } from '@/lib/services/inv/inv-stock.service';
import { logActivity } from '@/lib/api-utils';

const Schema = z.object({
  warehouseId: z.string().uuid(),
  itemId: z.string().uuid(),
  qty: z.number().positive('Quantity must be greater than 0'),
  notes: z.string().min(3, 'Notes must be at least 3 characters').max(255),
  referenceNo: z.string().max(50).optional().nullable(),
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
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { warehouseId, itemId, qty, notes, referenceNo } = parsed.data;

    // Validate item and warehouse exist
    const [item, warehouse] = await Promise.all([
      prisma.invItem.findFirst({ where: { id: itemId, deletedAt: null }, select: { id: true, code: true, name: true } }),
      prisma.invWarehouse.findFirst({ where: { id: warehouseId, deletedAt: null }, select: { id: true, code: true } }),
    ]);

    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 });

    const newBalance = await prisma.$transaction(async tx => {
      return stockIn(tx, {
        warehouseId,
        itemId,
        qty,
        referenceType: 'DIRECT',
        referenceNo: referenceNo?.trim() || 'OPENING-BALANCE',
        performedById: session.userId,
        notes,
      });
    });

    await logActivity({
      action: 'CREATE',
      entityType: 'InvStockBalance',
      entityId: `${warehouseId}-${itemId}`,
      entityName: `Direct stock addition: ${item.code} +${qty} → ${warehouse.code}`,
      userId: session.userId,
    });

    logger.info({ warehouseId, itemId, qty, userId: session.userId, item: item.code }, '[INV] Direct stock addition');
    return NextResponse.json({ newBalance, item, warehouse }, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[INV] Direct stock addition failed');
    return NextResponse.json({ error: 'Failed to add stock' }, { status: 500 });
  }
}
