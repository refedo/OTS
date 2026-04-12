/**
 * PUT    /api/hr/divisions/[id]  — rename / reorder / archive
 * DELETE /api/hr/divisions/[id]  — archive (soft)
 *
 * Rename cascades to every Employee.division string holding the old value,
 * mirroring the behaviour of /api/hr/sections/[id].
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  displayOrder: z.number().int().min(0).max(9999).optional(),
  archived: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.section.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await prisma.hrDivision.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Division not found' }, { status: 404 });

    const isRename = parsed.data.name && parsed.data.name !== existing.name;

    const updated = await prisma.$transaction(async (tx) => {
      if (isRename) {
        await tx.employee.updateMany({
          where: { division: existing.name },
          data: { division: parsed.data.name! },
        });
      }
      return tx.hrDivision.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined && { name: parsed.data.name }),
          ...(parsed.data.displayOrder !== undefined && { displayOrder: parsed.data.displayOrder }),
          ...(parsed.data.archived !== undefined && {
            archivedAt: parsed.data.archived ? new Date() : null,
          }),
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A division with that name already exists' }, { status: 409 });
    }
    logger.error({ error, id }, '[HR Divisions] Update failed');
    return NextResponse.json({ error: 'Failed to update division' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.section.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await prisma.hrDivision.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, '[HR Divisions] Archive failed');
    return NextResponse.json({ error: 'Failed to archive division' }, { status: 500 });
  }
}
