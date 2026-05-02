import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  projectId: z.string().uuid(),
  meetingDate: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  facilitatedById: z.string().uuid().optional().nullable(),
  attendees: z.string().optional().nullable(),
  agendaItems: z.string().optional().nullable(),
  deliverablesDiscussed: z.string().optional().nullable(),
  openItems: z.string().optional().nullable(),
  nextSteps: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SIGNED_OFF']).default('DRAFT'),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const where: Record<string, unknown> = { deletedAt: null };
    if (projectId) where.projectId = projectId;

    const records = await prisma.projectKickoffChecklist.findMany({
      where,
      select: {
        id: true, meetingDate: true, location: true, attendees: true,
        agendaItems: true, deliverablesDiscussed: true, openItems: true,
        nextSteps: true, status: true, signedOffAt: true, notes: true, createdAt: true,
        project: { select: { id: true, projectNumber: true, name: true } },
        facilitatedBy: { select: { id: true, name: true } },
        signedOffBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch kickoff checklists');
    return NextResponse.json({ error: 'Failed to fetch checklists' }, { status: 500 });
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
    const record = await prisma.projectKickoffChecklist.create({
      data: {
        projectId: data.projectId,
        meetingDate: data.meetingDate ? new Date(data.meetingDate) : null,
        location: data.location ?? null,
        facilitatedById: data.facilitatedById ?? null,
        attendees: data.attendees ?? null,
        agendaItems: data.agendaItems ?? null,
        deliverablesDiscussed: data.deliverablesDiscussed ?? null,
        openItems: data.openItems ?? null,
        nextSteps: data.nextSteps ?? null,
        status: data.status,
        notes: data.notes ?? null,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create kickoff checklist');
    return NextResponse.json({ error: 'Failed to create checklist' }, { status: 500 });
  }
}
