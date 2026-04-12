/**
 * GET / PUT / DELETE /api/hr/manpower-slots/[id]
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  slotCode: z.string().min(1).max(40).optional(),
  trade: z.string().min(1).max(120).optional(),
  hourlyRate: z.union([z.string(), z.number()]).optional(),
  cardStatus: z.enum(['ACTIVE', 'LOST', 'RETURNED', 'SUSPENDED']).optional(),
  notes: z.string().max(500).nullable().optional(),
  deleteReason: z.string().max(500).optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? await verifySession(token) : null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('hr.manpowerSlot.view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const slot = await prisma.manpowerSlot.findFirst({
    where: { id, deletedAt: null },
    include: { agency: true },
  });
  if (!slot) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(slot);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('hr.manpowerSlot.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.manpowerSlot.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const updateData: Record<string, unknown> = { updatedById: session.sub };
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === 'hourlyRate') {
      updateData[key] = String(value);
    } else {
      updateData[key] = value;
    }
  }

  try {
    const updated = await prisma.manpowerSlot.update({ where: { id }, data: updateData });
    logger.info({ slotId: id }, '[HR] Manpower slot updated');
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update slot';
    if (msg.includes('Unique')) {
      return NextResponse.json({ error: 'Slot code already exists' }, { status: 409 });
    }
    logger.error({ error, slotId: id }, '[HR] Failed to update slot');
    return NextResponse.json({ error: 'Failed to update slot' }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('hr.manpowerSlot.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.manpowerSlot.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let deleteReason: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.deleteReason === 'string') {
      deleteReason = body.deleteReason.slice(0, 500);
    }
  } catch {
    // no body
  }

  await prisma.manpowerSlot.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: session.sub, deleteReason },
  });
  logger.info({ slotId: id }, '[HR] Manpower slot soft-deleted');
  return NextResponse.json({ success: true });
}
