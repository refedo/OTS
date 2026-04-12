/**
 * GET  /api/hr/manpower-slots — list slots (optionally filtered by agencyId / trade)
 * POST /api/hr/manpower-slots — create a single slot
 *
 * Gated by `hr.manpowerSlot.view` / `hr.manpowerSlot.manage`.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const createSchema = z.object({
  agencyId: z.string().uuid(),
  slotCode: z.string().min(1).max(40),
  trade: z.string().min(1).max(120),
  hourlyRate: z.union([z.string(), z.number()]),
  cardStatus: z.enum(['ACTIVE', 'LOST', 'RETURNED', 'SUSPENDED']).optional(),
  notes: z.string().max(500).nullable().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? await verifySession(token) : null;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('hr.manpowerSlot.view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const agencyId = searchParams.get('agencyId');
  const trade = searchParams.get('trade');
  const cardStatus = searchParams.get('cardStatus');

  const where: Record<string, unknown> = { deletedAt: null };
  if (agencyId) where.agencyId = agencyId;
  if (trade) where.trade = trade;
  if (cardStatus) where.cardStatus = cardStatus;

  const slots = await prisma.manpowerSlot.findMany({
    where,
    orderBy: [{ agencyId: 'asc' }, { slotCode: 'asc' }],
    include: {
      agency: { select: { id: true, nameEn: true, nameAr: true, status: true } },
    },
  });
  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('hr.manpowerSlot.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const slot = await prisma.manpowerSlot.create({
      data: {
        agencyId: data.agencyId,
        slotCode: data.slotCode,
        trade: data.trade,
        hourlyRate: String(data.hourlyRate),
        cardStatus: data.cardStatus ?? 'ACTIVE',
        notes: data.notes ?? null,
        createdById: session.sub,
      },
    });
    logger.info({ slotId: slot.id, slotCode: slot.slotCode }, '[HR] Manpower slot created');
    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    logger.error({ error }, '[HR] Failed to create manpower slot');
    const msg = error instanceof Error ? error.message : 'Failed to create slot';
    if (msg.includes('Unique')) {
      return NextResponse.json({ error: 'Slot code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 });
  }
}
