import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

const patchSchema = z.object({
  contractReceived: z.enum(['yes', 'no', 'na']).nullable().optional(),
  answers: z.record(z.unknown()).optional(),
  notifications: z.record(z.unknown()).optional(),
  spcsAttachment: z.string().max(500).nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const checklist = await prisma.projectSetupChecklist.findUnique({
    where: { projectId: id },
  });

  return NextResponse.json(checklist ?? null);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const project = await prisma.project.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, projectNumber: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.contractReceived !== undefined) updateData.contractReceived = parsed.data.contractReceived;
    if (parsed.data.answers !== undefined) updateData.answers = parsed.data.answers;
    if (parsed.data.notifications !== undefined) updateData.notifications = parsed.data.notifications;
    if (parsed.data.spcsAttachment !== undefined) updateData.spcsAttachment = parsed.data.spcsAttachment;

    const checklist = await prisma.projectSetupChecklist.upsert({
      where: { projectId: id },
      create: {
        id: randomUUID(),
        projectId: id,
        ...updateData,
      },
      update: updateData,
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'Project',
      entityId: id,
      entityName: `${project.projectNumber} - ${project.name}`,
      userId: session.sub,
      projectId: id,
      metadata: { action: 'checklist_update' },
    });

    logger.info({ projectId: id, userId: session.sub }, 'Project checklist updated');

    return NextResponse.json(checklist);
  } catch (error) {
    logger.error({ error }, 'Error updating project checklist');
    return NextResponse.json({ error: 'Failed to update checklist' }, { status: 500 });
  }
}
