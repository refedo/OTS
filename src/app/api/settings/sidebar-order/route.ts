import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { z } from 'zod';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const DATA_FILE = join(process.cwd(), 'data', 'sidebar-order.json');

interface SidebarOrderData {
  order?: string[];
  singleOrder?: string[];
}

function readData(): SidebarOrderData {
  try {
    if (!existsSync(DATA_FILE)) return {};
    const raw = readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Backwards-compat: old format was a plain array
    if (Array.isArray(parsed)) return { order: parsed };
    return parsed as SidebarOrderData;
  } catch {
    return {};
  }
}

function writeData(data: SidebarOrderData) {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8');
}

const bodySchema = z.object({
  order: z.array(z.string()).optional(),
  singleOrder: z.array(z.string()).optional(),
});

export async function GET() {
  const data = readData();
  return NextResponse.json({ order: data.order ?? null, singleOrder: data.singleOrder ?? null });
}

export async function POST(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isAdmin: true, role: { select: { name: true } } },
  });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdminOrCeo = user.isAdmin || ['Admin', 'CEO', 'admin'].includes(user.role.name);
  if (!isAdminOrCeo) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const current = readData();
  writeData({
    order: parsed.data.order ?? current.order,
    singleOrder: parsed.data.singleOrder ?? current.singleOrder,
  });
  return NextResponse.json({ ok: true });
}
