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

    const document = await prisma.imsDocument.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const distributions = await prisma.imsDistribution.findMany({
      where: { documentId: id },
      include: {
        recipients: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(distributions);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS distributions');
    return NextResponse.json({ error: 'Failed to fetch distributions' }, { status: 500 });
  }
}

export async function POST(
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

    const document = await prisma.imsDocument.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, documentNumber: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const body = await request.json();
    const { userIds, notes, revisionId } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Missing required field: userIds (non-empty array)' }, { status: 400 });
    }

    const distribution = await prisma.imsDistribution.create({
      data: {
        documentId: id,
        revisionId: revisionId ?? null,
        issuedById: session.sub,
        notes: notes ?? null,
        recipients: {
          create: userIds.map((userId: string) => ({ userId })),
        },
      },
      include: {
        recipients: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_CREATED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsDistribution',
      entityId: distribution.id,
      entityName: document.documentNumber,
      summary: `Document ${document.documentNumber} distributed to ${userIds.length} recipient(s)`,
      details: { documentId: id, recipientCount: userIds.length },
    });

    return NextResponse.json(distribution, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS distribution');
    return NextResponse.json({ error: 'Failed to create distribution' }, { status: 500 });
  }
}
