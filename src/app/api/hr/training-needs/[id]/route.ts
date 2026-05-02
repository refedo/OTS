import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  department: z.string().min(1).optional(),
  roleTitle: z.string().min(1).optional(),
  competencyGap: z.string().min(1).optional(),
  requiredTraining: z.string().min(1).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  targetDate: z.string().datetime().optional().nullable(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']).optional(),
  responsibleId: z.string().uuid().optional().nullable(),
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
    const updated = await prisma.hrTrainingNeed.update({
      where: { id },
      data: {
        ...data,
        targetDate: data.targetDate !== undefined ? (data.targetDate ? new Date(data.targetDate) : null) : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update training need');
    return NextResponse.json({ error: 'Failed to update training need' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    await prisma.hrTrainingNeed.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete training need');
    return NextResponse.json({ error: 'Failed to delete training need' }, { status: 500 });
  }
}
