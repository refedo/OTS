/**
 * PUT    /api/hr/sections/[id]  — update (rename, reorder, archive/unarchive)
 * DELETE /api/hr/sections/[id]  — archive (soft): sets archivedAt = now
 *
 * Both gated by `hr.section.manage`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
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
    const existing = await prisma.hrSection.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

    // If renaming, cascade the rename to all Employees that still hold the
    // old string value — keeps the dropdown consistent without a join table.
    const isRename = parsed.data.name && parsed.data.name !== existing.name;

    const updated = await prisma.$transaction(async (tx) => {
      if (isRename) {
        await tx.employee.updateMany({
          where: { section: existing.name },
          data: { section: parsed.data.name! },
        });
      }
      return tx.hrSection.update({
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
      return NextResponse.json({ error: 'A section with that name already exists' }, { status: 409 });
    }
    logger.error({ error, id }, '[HR Sections] Update failed');
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canManage = await checkPermission('hr.section.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await prisma.hrSection.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, '[HR Sections] Archive failed');
    return NextResponse.json({ error: 'Failed to archive section' }, { status: 500 });
  }
}
