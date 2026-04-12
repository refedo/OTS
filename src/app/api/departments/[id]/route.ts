/**
 * PUT    /api/departments/[id]  — rename, edit description, archive/unarchive
 * DELETE /api/departments/[id]  — archive (soft) by setting archivedAt
 *
 * Archive (not hard delete) keeps historical references from Employees,
 * Users, Tasks, Initiatives, etc. intact.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(1000).optional().nullable(),
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

  const canEdit = await checkPermission('departments.edit');
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.archived !== undefined && {
          archivedAt: parsed.data.archived ? new Date() : null,
        }),
      },
    });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A department with that name already exists' }, { status: 409 });
    }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    logger.error({ error, id }, '[Departments] Update failed');
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canDelete = await checkPermission('departments.delete');
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await prisma.department.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, id }, '[Departments] Archive failed');
    return NextResponse.json({ error: 'Failed to archive department' }, { status: 500 });
  }
}
