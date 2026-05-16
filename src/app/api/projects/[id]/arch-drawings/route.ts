import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { logActivity } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const patchSchema = z.object({
  buildingId: z.string().uuid(),
  received: z.boolean(),
});

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

    const { buildingId, received } = parsed.data;

    const building = await prisma.building.findFirst({
      where: { id: buildingId, projectId: id, deletedAt: null },
      select: { id: true },
    });
    if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 });

    const updated = await prisma.building.update({
      where: { id: buildingId },
      data: { archDrawingsReceived: received },
      select: { id: true, name: true, designation: true, archDrawingsReceived: true },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'Project',
      entityId: id,
      entityName: `${project.projectNumber} - ${project.name}`,
      userId: session.sub,
      projectId: id,
      metadata: { action: 'arch_drawings_update', buildingId, received },
    });

    logger.info({ projectId: id, buildingId, received, userId: session.sub }, 'Arch drawings status updated');

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Error updating arch drawings status');
    return NextResponse.json({ error: 'Failed to update arch drawings status' }, { status: 500 });
  }
}
