import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const CreateSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  sourceCodes: z.string().max(500).optional(),
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
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const sites = await prisma.invSite.findMany({
      where: { deletedAt: null, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, description: true, sourceCodes: true, isActive: true, createdAt: true },
    });

    return NextResponse.json(sites);
  } catch (error) {
    logger.error({ error }, '[INV] Failed to fetch sites');
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['Admin', 'CEO', 'Manager'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const { code, name, description, sourceCodes } = parsed.data;

    const existing = await prisma.invSite.findFirst({ where: { code, deletedAt: null }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Site code already exists' }, { status: 409 });
    }

    const site = await prisma.invSite.create({
      data: { id: uuidv4(), code, name, description: description || null, sourceCodes: sourceCodes || null, isActive: true, createdById: session.sub },
      select: { id: true, code: true, name: true, description: true, sourceCodes: true, isActive: true, createdAt: true },
    });

    logger.info({ code, createdBy: session.sub }, '[INV] Site created');
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to create site');
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}
