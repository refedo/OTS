import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/api-utils';

const CreateSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  unit: z.string().min(1).max(20),
  category: z.enum(['STRUCTURAL_STEEL', 'SHEET', 'PIPE', 'CONSUMABLE', 'FASTENER', 'PAINT', 'ELECTRICAL', 'OFFCUT', 'OTHER']),
  defaultWhType: z.enum(['RAW_MATERIAL', 'CONSUMABLE', 'OFFCUT']),
  minStockLevel: z.number().min(0).default(0),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

function hasInvPermission(session: { userId: string; role: string }, required: string): boolean {
  const { hasPermission } = require('@/lib/permissions');
  // Get user permissions from DB is expensive; check role-based fallback
  const adminRoles = ['Admin', 'CEO', 'Manager'];
  const invAdminRoles = ['Admin', 'CEO', 'Manager'];
  if (required === 'inv.admin' && invAdminRoles.includes(session.role)) return true;
  if (required === 'inv.view') return true; // checked by auth
  return adminRoles.includes(session.role);
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const whType = searchParams.get('whType');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: Record<string, unknown> = { deletedAt: null };
    if (activeOnly) where.isActive = true;
    if (category) where.category = category;
    if (whType) where.defaultWhType = whType;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const items = await prisma.invItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        unit: true,
        category: true,
        defaultWhType: true,
        minStockLevel: true,
        isActive: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch items');
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
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

    // Check code uniqueness
    const existing = await prisma.invItem.findUnique({ where: { code: data.code }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Item code already exists' }, { status: 409 });
    }

    const item = await prisma.invItem.create({
      data: {
        id: uuidv4(),
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        unit: data.unit,
        category: data.category,
        defaultWhType: data.defaultWhType,
        minStockLevel: data.minStockLevel,
        isActive: true,
        createdById: session.userId,
      },
      select: { id: true, code: true, name: true },
    });

    await logActivity({
      action: 'CREATE',
      entityType: 'InvItem',
      entityId: item.id,
      entityName: `${item.code} — ${item.name}`,
      userId: session.userId,
    });

    logger.info({ itemId: item.id, code: item.code }, '[INV] Item created');
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to create item');
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
