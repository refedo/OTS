import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  topic: z.string().min(1).optional(),
  conductedDate: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  attendeeCount: z.number().int().optional().nullable(),
  durationMinutes: z.number().int().optional().nullable(),
  content: z.string().optional().nullable(),
  followUpActions: z.string().optional().nullable(),
  conductedById: z.string().uuid().optional().nullable(),
  status: z.enum(['PLANNED', 'COMPLETED']).optional(),
  notes: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const updated = await prisma.imsToolboxTalk.update({
      where: { id },
      data: {
        ...data,
        conductedDate: data.conductedDate !== undefined ? (data.conductedDate ? new Date(data.conductedDate) : null) : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update toolbox talk');
    return NextResponse.json({ error: 'Failed to update toolbox talk' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.imsToolboxTalk.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete toolbox talk');
    return NextResponse.json({ error: 'Failed to delete toolbox talk' }, { status: 500 });
  }
}
