import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  topic: z.string().min(1),
  conductedDate: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  attendeeCount: z.number().int().optional().nullable(),
  durationMinutes: z.number().int().optional().nullable(),
  content: z.string().optional().nullable(),
  followUpActions: z.string().optional().nullable(),
  conductedById: z.string().uuid().optional().nullable(),
  status: z.enum(['PLANNED', 'COMPLETED']).default('PLANNED'),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function nextTalkNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.imsToolboxTalk.findFirst({
    where: { talkNumber: { startsWith: `TBT-${year}-` } },
    orderBy: { talkNumber: 'desc' },
    select: { talkNumber: true },
  });
  const n = last ? (parseInt(last.talkNumber.split('-')[2]) || 0) + 1 : 1;
  return `TBT-${year}-${String(n).padStart(4, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { deletedAt: null };
    if (status) where.status = status;

    const records = await prisma.imsToolboxTalk.findMany({
      where,
      select: {
        id: true, talkNumber: true, topic: true, conductedDate: true, location: true,
        attendeeCount: true, durationMinutes: true, content: true,
        followUpActions: true, status: true, notes: true, createdAt: true,
        conductedBy: { select: { id: true, name: true } },
      },
      orderBy: { conductedDate: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch toolbox talks');
    return NextResponse.json({ error: 'Failed to fetch toolbox talks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const talkNumber = await nextTalkNumber();

    const record = await prisma.imsToolboxTalk.create({
      data: {
        talkNumber,
        topic: data.topic,
        conductedDate: data.conductedDate ? new Date(data.conductedDate) : null,
        location: data.location ?? null,
        attendeeCount: data.attendeeCount ?? null,
        durationMinutes: data.durationMinutes ?? null,
        content: data.content ?? null,
        followUpActions: data.followUpActions ?? null,
        conductedById: data.conductedById ?? null,
        status: data.status,
        notes: data.notes ?? null,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true, talkNumber: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create toolbox talk');
    return NextResponse.json({ error: 'Failed to create toolbox talk' }, { status: 500 });
  }
}
