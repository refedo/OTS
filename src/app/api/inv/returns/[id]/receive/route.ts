import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { logActivity } from '@/lib/api-utils';
import { returnStock } from '@/lib/services/inv/inv-stock.service';

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const ret = await prisma.invReturn.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, returnNumber: true, status: true,
        warehouseId: true, itemId: true, quantity: true, description: true,
      },
    });

    if (!ret) return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    if (ret.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only PENDING returns can be received' }, { status: 422 });
    }

    await prisma.$transaction(async tx => {
      await returnStock(tx, {
        warehouseId: ret.warehouseId,
        itemId: ret.itemId,
        qty: ret.quantity,
        returnId: ret.id,
        returnNo: ret.returnNumber,
        performedById: session.userId,
        notes: ret.description ?? undefined,
      });

      await tx.invReturn.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          receivedById: session.userId,
        },
      });
    });

    await logActivity({
      action: 'APPROVE',
      entityType: 'InvReturn',
      entityId: id,
      entityName: ret.returnNumber,
      userId: session.userId,
    });

    logger.info({ returnId: id }, '[INV] Return received, stock updated');
    return NextResponse.json({ status: 'RECEIVED' });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to receive return');
    return NextResponse.json({ error: 'Failed to receive return' }, { status: 500 });
  }
}
