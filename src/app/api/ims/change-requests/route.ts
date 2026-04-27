import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

async function generateDcrNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const count = await prisma.imsChangeRequest.count({
    where: {
      createdAt: { gte: yearStart, lt: yearEnd },
    },
  });

  const sequence = (count + 1).toString().padStart(4, '0');
  return `DCR-${year}-${sequence}`;
}

export async function GET(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const documentId = searchParams.get('documentId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { deletedAt: null };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (documentId) where.documentId = documentId;

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { dcrNumber: { contains: search } },
      ];
    }

    const changeRequests = await prisma.imsChangeRequest.findMany({
      where,
      select: {
        id: true,
        dcrNumber: true,
        title: true,
        description: true,
        reason: true,
        status: true,
        priority: true,
        workflowInstanceId: true,
        createdAt: true,
        updatedAt: true,
        document: {
          select: { id: true, documentNumber: true, title: true },
        },
        requestedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(changeRequests);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS change requests');
    return NextResponse.json({ error: 'Failed to fetch change requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      reason,
      documentId,
      priority,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }

    const dcrNumber = await generateDcrNumber();

    const changeRequest = await prisma.imsChangeRequest.create({
      data: {
        dcrNumber,
        title,
        description: description ?? null,
        reason: reason ?? null,
        documentId: documentId ?? null,
        requestedById: session.sub,
        priority: priority ?? 'MEDIUM',
        status: 'SUBMITTED',
      },
      include: {
        document: { select: { id: true, documentNumber: true, title: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_CREATED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsChangeRequest',
      entityId: changeRequest.id,
      entityName: changeRequest.dcrNumber,
      summary: `DCR ${changeRequest.dcrNumber} created: ${changeRequest.title}`,
      details: { dcrNumber: changeRequest.dcrNumber, documentId, priority: changeRequest.priority },
    });

    return NextResponse.json(changeRequest, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS change request');
    return NextResponse.json({ error: 'Failed to create change request' }, { status: 500 });
  }
}
