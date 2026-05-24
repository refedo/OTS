import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/api-utils';

const CreateSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(100),
  type: z.enum(['RAW_MATERIAL', 'CONSUMABLE', 'OFFCUT']),
  siteId: z.string().min(1).max(10),
  siteName: z.string().min(1).max(50),
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
    const siteId = searchParams.get('siteId');
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: Record<string, unknown> = { deletedAt: null };
    if (activeOnly) where.isActive = true;
    if (siteId) where.siteId = siteId;
    if (type) where.type = type;

    const warehouses = await prisma.invWarehouse.findMany({
      where,
      orderBy: [{ siteId: 'asc' }, { type: 'asc' }, { code: 'asc' }],
      select: {
        id: true, code: true, name: true, type: true,
        siteId: true, siteName: true, isActive: true, createdAt: true,
      },
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch warehouses');
    return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 });
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
    const existing = await prisma.invWarehouse.findUnique({ where: { code: data.code }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Warehouse code already exists' }, { status: 409 });
    }

    const warehouse = await prisma.invWarehouse.create({
      data: {
        id: uuidv4(),
        code: data.code,
        name: data.name,
        type: data.type,
        siteId: data.siteId,
        siteName: data.siteName,
        isActive: true,
        createdById: session.userId,
      },
      select: { id: true, code: true, name: true },
    });

    await logActivity({
      action: 'CREATE',
      entityType: 'InvWarehouse',
      entityId: warehouse.id,
      entityName: warehouse.name,
      userId: session.userId,
    });

    logger.info({ warehouseId: warehouse.id }, '[INV] Warehouse created');
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to create warehouse');
    return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 });
  }
}
