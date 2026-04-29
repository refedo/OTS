import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().max(5000).optional(),
  color: z.string().max(20).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'dismissed']).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  position: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  const existing = await prisma.ceoNote.findFirst({
    where: { id, createdById: session.sub, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const { tags, status, ...rest } = parsed.data;
  const resolvedAt =
    status === 'resolved' && existing.status !== 'resolved' ? new Date() :
    status !== 'resolved' ? null :
    existing.resolvedAt;

  const note = await prisma.ceoNote.update({
    where: { id },
    data: {
      ...rest,
      ...(status !== undefined ? { status } : {}),
      ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}),
      ...(resolvedAt !== undefined ? { resolvedAt } : {}),
    },
  });

  logger.info({ noteId: id, userId: session.sub }, 'CEO Arena note updated');
  return NextResponse.json({ note });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  const existing = await prisma.ceoNote.findFirst({
    where: { id, createdById: session.sub, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.ceoNote.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  logger.info({ noteId: id, userId: session.sub }, 'CEO Arena note deleted');
  return NextResponse.json({ success: true });
}
