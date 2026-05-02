import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  meetingDate: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  facilitatedById: z.string().uuid().optional().nullable(),
  attendees: z.string().optional().nullable(),
  agendaItems: z.string().optional().nullable(),
  deliverablesDiscussed: z.string().optional().nullable(),
  openItems: z.string().optional().nullable(),
  nextSteps: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SIGNED_OFF']).optional(),
  signedOffAt: z.string().datetime().optional().nullable(),
  signedOffById: z.string().uuid().optional().nullable(),
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
    const updated = await prisma.projectKickoffChecklist.update({
      where: { id },
      data: {
        ...data,
        meetingDate: data.meetingDate !== undefined ? (data.meetingDate ? new Date(data.meetingDate) : null) : undefined,
        signedOffAt: data.signedOffAt !== undefined ? (data.signedOffAt ? new Date(data.signedOffAt) : null) : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update kickoff checklist');
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.projectKickoffChecklist.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete kickoff checklist');
    return NextResponse.json({ error: 'Failed to delete checklist' }, { status: 500 });
  }
}
