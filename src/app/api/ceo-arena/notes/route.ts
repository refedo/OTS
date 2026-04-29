import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  type: z.enum(['brainstorm', 'headache', 'zeigarnik']),
  title: z.string().min(1).max(255),
  content: z.string().max(5000),
  color: z.string().max(20).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  position: z.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const notes = await prisma.ceoNote.findMany({
    where: {
      createdById: session.sub,
      deletedAt: null,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      type: true,
      title: true,
      content: true,
      color: true,
      priority: true,
      status: true,
      tags: true,
      position: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const { type, title, content, color = '#fef08a', priority = 'medium', tags, position = 0 } = parsed.data;

  const note = await prisma.ceoNote.create({
    data: {
      type,
      title,
      content,
      color,
      priority,
      status: 'open',
      tags: tags ? JSON.stringify(tags) : null,
      position,
      createdById: session.sub,
    },
  });

  logger.info({ noteId: note.id, type, userId: session.sub }, 'CEO Arena note created');
  return NextResponse.json({ note }, { status: 201 });
}
