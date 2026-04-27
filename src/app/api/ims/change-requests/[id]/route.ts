import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const changeRequest = await prisma.imsChangeRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        document: { select: { id: true, documentNumber: true, title: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    if (!changeRequest) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }

    return NextResponse.json(changeRequest);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS change request');
    return NextResponse.json({ error: 'Failed to fetch change request' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.imsChangeRequest.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, dcrNumber: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, reason, status, priority, documentId, workflowInstanceId } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (reason !== undefined) updateData.reason = reason;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (documentId !== undefined) updateData.documentId = documentId;
    if (workflowInstanceId !== undefined) updateData.workflowInstanceId = workflowInstanceId;

    const changeRequest = await prisma.imsChangeRequest.update({
      where: { id },
      data: updateData,
      include: {
        document: { select: { id: true, documentNumber: true, title: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_UPDATED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsChangeRequest',
      entityId: changeRequest.id,
      entityName: changeRequest.dcrNumber,
      summary: `DCR ${changeRequest.dcrNumber} updated`,
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(changeRequest);
  } catch (error) {
    logger.error({ error }, 'Failed to update IMS change request');
    return NextResponse.json({ error: 'Failed to update change request' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.imsChangeRequest.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, dcrNumber: true, title: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Change request not found' }, { status: 404 });
    }

    await prisma.imsChangeRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_DELETED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsChangeRequest',
      entityId: id,
      entityName: existing.dcrNumber,
      summary: `DCR ${existing.dcrNumber} deleted`,
      details: { dcrNumber: existing.dcrNumber, title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete IMS change request');
    return NextResponse.json({ error: 'Failed to delete change request' }, { status: 500 });
  }
}
