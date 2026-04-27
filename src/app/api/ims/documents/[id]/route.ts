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
      include: {
        category: { select: { id: true, code: true, name: true, nameAr: true } },
        department: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        revisions: {
          include: {
            preparedBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        distributions: {
          include: {
            recipients: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        clauseMappings: {
          include: {
            clause: {
              select: {
                id: true,
                standard: true,
                clause: true,
                title: true,
                level: true,
              },
            },
          },
        },
        _count: {
          select: {
            revisions: true,
            distributions: true,
            changeRequests: true,
            clauseMappings: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS document');
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
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

    const existing = await prisma.imsDocument.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, reviewFrequencyDays: true, nextReviewDate: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      titleAr,
      categoryId,
      departmentId,
      ownerId,
      reviewerId,
      applicableStandards,
      scope,
      purpose,
      site,
      confidentiality,
      reviewFrequencyDays,
      fileUrl,
      status,
      currentVersion,
      lastReviewDate,
      issuedAt,
    } = body;

    const updateData: Record<string, unknown> = { updatedById: session.sub };

    if (title !== undefined) updateData.title = title;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    if (reviewerId !== undefined) updateData.reviewerId = reviewerId;
    if (applicableStandards !== undefined) updateData.applicableStandards = applicableStandards;
    if (scope !== undefined) updateData.scope = scope;
    if (purpose !== undefined) updateData.purpose = purpose;
    if (site !== undefined) updateData.site = site;
    if (confidentiality !== undefined) updateData.confidentiality = confidentiality;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    if (status !== undefined) updateData.status = status;
    if (currentVersion !== undefined) updateData.currentVersion = currentVersion;
    if (lastReviewDate !== undefined) updateData.lastReviewDate = new Date(lastReviewDate);
    if (issuedAt !== undefined) updateData.issuedAt = new Date(issuedAt);

    if (reviewFrequencyDays !== undefined) {
      updateData.reviewFrequencyDays = reviewFrequencyDays;
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + reviewFrequencyDays);
      updateData.nextReviewDate = nextReviewDate;
    }

    const document = await prisma.imsDocument.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_UPDATED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsDocument',
      entityId: document.id,
      entityName: document.documentNumber,
      summary: `IMS document ${document.documentNumber} updated`,
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(document);
  } catch (error) {
    logger.error({ error }, 'Failed to update IMS document');
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
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

    const existing = await prisma.imsDocument.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, documentNumber: true, title: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await prisma.imsDocument.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session.sub,
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_DELETED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsDocument',
      entityId: id,
      entityName: existing.documentNumber,
      summary: `IMS document ${existing.documentNumber} deleted`,
      details: { documentNumber: existing.documentNumber, title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete IMS document');
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
