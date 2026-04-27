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

    const revisions = await prisma.imsRevision.findMany({
      where: { documentId: id },
      include: {
        preparedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(revisions);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS revisions');
    return NextResponse.json({ error: 'Failed to fetch revisions' }, { status: 500 });
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
    const {
      version,
      changeDescription,
      changeType,
      status,
      fileUrl,
      preparedById,
      reviewedById,
      approvedById,
      effectiveDate,
      workflowInstanceId,
    } = body;

    if (!version) {
      return NextResponse.json({ error: 'Missing required field: version' }, { status: 400 });
    }

    const revision = await prisma.imsRevision.create({
      data: {
        documentId: id,
        version,
        changeDescription: changeDescription ?? null,
        changeType: changeType ?? 'MINOR',
        status: status ?? 'DRAFT',
        fileUrl: fileUrl ?? null,
        preparedById: preparedById ?? session.sub,
        reviewedById: reviewedById ?? null,
        approvedById: approvedById ?? null,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        workflowInstanceId: workflowInstanceId ?? null,
      },
      include: {
        preparedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_CREATED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsRevision',
      entityId: revision.id,
      entityName: `${document.documentNumber} v${version}`,
      summary: `Revision ${version} created for document ${document.documentNumber}`,
      details: { documentId: id, version, changeType: revision.changeType },
    });

    return NextResponse.json(revision, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS revision');
    return NextResponse.json({ error: 'Failed to create revision' }, { status: 500 });
  }
}
