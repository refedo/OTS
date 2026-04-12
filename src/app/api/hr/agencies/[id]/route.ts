/**
 * GET    /api/hr/agencies/[id]
 * PUT    /api/hr/agencies/[id]
 * DELETE /api/hr/agencies/[id] — soft-delete
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  nameEn: z.string().min(1).max(255).optional(),
  nameAr: z.string().max(255).nullable().optional(),
  contactPerson: z.string().max(200).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  contractRef: z.string().max(120).nullable().optional(),
  contractStart: z.string().nullable().optional(),
  contractEnd: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
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
  if (!(await checkPermission('hr.agency.view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const agency = await prisma.agency.findFirst({
    where: { id, deletedAt: null },
    include: {
      slots: { where: { deletedAt: null }, orderBy: { slotCode: 'asc' } },
    },
  });
  if (!agency) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(agency);
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('hr.agency.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.agency.findFirst({ where: { id, deletedAt: null } });
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
    if (key === 'contractStart' || key === 'contractEnd') {
      updateData[key] = value ? new Date(value as string) : null;
    } else {
      updateData[key] = value;
    }
  }

  const updated = await prisma.agency.update({ where: { id }, data: updateData });
  logger.info({ agencyId: id }, '[HR] Agency updated');
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await checkPermission('hr.agency.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await prisma.agency.findFirst({ where: { id, deletedAt: null } });
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

  await prisma.agency.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: session.sub, deleteReason },
  });
  logger.info({ agencyId: id }, '[HR] Agency soft-deleted');
  return NextResponse.json({ success: true });
}
