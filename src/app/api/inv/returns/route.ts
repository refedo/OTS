import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/api-utils';
import { nextReturnNumber } from '@/lib/services/inv/inv-sequence.service';

const CreateSchema = z.object({
  returnType: z.enum(['UNUSED_STOCK', 'OFFCUT']),
  siteId: z.string().min(1).max(10),
  locationId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: z.number().positive(),
  description: z.string().optional().nullable(),
  mirOutId: z.string().uuid().optional().nullable(),
}).refine(
  data => data.returnType !== 'OFFCUT' || (data.description && data.description.trim().length > 5),
  { message: 'Description is mandatory for OFFCUT returns (min 5 chars)', path: ['description'] }
);

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
    const status = searchParams.get('status');
    const returnType = searchParams.get('returnType');
    const siteId = searchParams.get('siteId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;
    if (returnType) where.returnType = returnType;
    if (siteId) where.siteId = siteId;

    const [returns, total] = await Promise.all([
      prisma.invReturn.findMany({
        where,
        include: {
          requestedBy: { select: { id: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } },
          item: { select: { id: true, code: true, name: true, unit: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invReturn.count({ where }),
    ]);

    return NextResponse.json({ returns, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch returns');
    return NextResponse.json({ error: 'Failed to fetch returns' }, { status: 500 });
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

    // Validate warehouse matches site
    const warehouse = await prisma.invWarehouse.findFirst({
      where: { id: data.warehouseId, siteId: data.siteId, deletedAt: null, isActive: true },
      select: { id: true, type: true },
    });
    if (!warehouse) return NextResponse.json({ error: 'Warehouse not found for this factory' }, { status: 404 });

    // OFFCUT returns must go to OFFCUT warehouse
    if (data.returnType === 'OFFCUT' && warehouse.type !== 'OFFCUT') {
      return NextResponse.json({ error: 'OFFCUT returns must go to the Off-cuts Warehouse' }, { status: 422 });
    }

    const year = new Date().getFullYear();
    const returnNumber = await nextReturnNumber(year);

    const ret = await prisma.invReturn.create({
      data: {
        id: uuidv4(),
        returnNumber,
        returnType: data.returnType,
        siteId: data.siteId,
        locationId: data.locationId,
        warehouseId: data.warehouseId,
        itemId: data.itemId,
        quantity: data.quantity,
        description: data.description ?? null,
        mirOutId: data.mirOutId ?? null,
        status: 'PENDING',
        requestedById: session.userId,
      },
      select: { id: true, returnNumber: true, status: true },
    });

    await logActivity({
      action: 'CREATE',
      entityType: 'InvReturn',
      entityId: ret.id,
      entityName: returnNumber,
      userId: session.userId,
    });

    logger.info({ returnId: ret.id, returnNumber }, '[INV] Return request created');
    return NextResponse.json(ret, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to create return');
    return NextResponse.json({ error: 'Failed to create return' }, { status: 500 });
  }
}
