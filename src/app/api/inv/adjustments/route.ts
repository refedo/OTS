import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/api-utils';
import { adjustStock } from '@/lib/services/inv/inv-stock.service';
import { nextAdjustmentNumber } from '@/lib/services/inv/inv-sequence.service';

const CreateSchema = z.object({
  warehouseId: z.string().uuid(),
  itemId: z.string().uuid(),
  physicalQty: z.number().min(0),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    const where: Record<string, unknown> = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (itemId) where.itemId = itemId;

    const [adjustments, total] = await Promise.all([
      prisma.invAdjustment.findMany({
        where,
        include: {
          warehouse: { select: { id: true, code: true, name: true } },
          item: { select: { id: true, code: true, name: true, unit: true } },
          authorizedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invAdjustment.count({ where }),
    ]);

    return NextResponse.json({ adjustments, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch adjustments');
    return NextResponse.json({ error: 'Failed to fetch adjustments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const year = new Date().getFullYear();
    const adjustmentNumber = await nextAdjustmentNumber(year);

    // Read current balance
    const balance = await prisma.invStockBalance.findUnique({
      where: { warehouseId_itemId: { warehouseId: data.warehouseId, itemId: data.itemId } },
      select: { quantity: true },
    });
    const systemQty = balance?.quantity ?? 0;
    const variance = data.physicalQty - systemQty;

    const adjustmentId = uuidv4();

    await prisma.$transaction(async tx => {
      // Create adjustment record
      await tx.invAdjustment.create({
        data: {
          id: adjustmentId,
          adjustmentNumber,
          warehouseId: data.warehouseId,
          itemId: data.itemId,
          systemQty,
          physicalQty: data.physicalQty,
          variance,
          reason: data.reason,
          authorizedById: session.userId,
        },
      });

      // Apply the stock adjustment
      await adjustStock(tx, {
        warehouseId: data.warehouseId,
        itemId: data.itemId,
        physicalQty: data.physicalQty,
        systemQty,
        adjustmentId,
        adjustmentNo: adjustmentNumber,
        authorizedById: session.userId,
        reason: data.reason,
      });
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'InvAdjustment',
      entityId: adjustmentId,
      entityName: adjustmentNumber,
      userId: session.userId,
    });

    logger.info({ adjustmentId, adjustmentNumber, variance }, '[INV] Stock adjustment applied');
    return NextResponse.json({ id: adjustmentId, adjustmentNumber, systemQty, physicalQty: data.physicalQty, variance }, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to create adjustment');
    return NextResponse.json({ error: 'Failed to create adjustment' }, { status: 500 });
  }
}
