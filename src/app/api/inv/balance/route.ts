import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId');
    const itemId = searchParams.get('itemId');
    const siteId = searchParams.get('siteId');

    const where: Record<string, unknown> = {
      warehouse: { deletedAt: null },
      item:      { deletedAt: null },
    };

    if (warehouseId) {
      where.warehouseId = warehouseId;
      where.warehouse = { deletedAt: null };
    } else if (siteId) {
      where.warehouse = { siteId, deletedAt: null };
    }

    if (itemId) where.itemId = itemId;

    const balances = await prisma.invStockBalance.findMany({
      where,
      include: {
        warehouse: { select: { id: true, code: true, name: true, type: true, siteId: true, siteName: true } },
        item: { select: { id: true, code: true, name: true, unit: true, category: true, minStockLevel: true } },
      },
      orderBy: [{ warehouse: { siteId: 'asc' } }, { item: { code: 'asc' } }],
    });

    const result = balances.map(b => ({
      warehouseId: b.warehouseId,
      warehouse: b.warehouse,
      itemId: b.itemId,
      item: b.item,
      quantity: b.quantity,
      isLowStock: b.quantity < b.item.minStockLevel,
      updatedAt: b.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch stock balance');
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
