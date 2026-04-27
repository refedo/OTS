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

    const risk = await prisma.imsRisk.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        assessments: {
          include: {
            assessedBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        treatments: {
          include: {
            responsible: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        hazards: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            assessments: true,
            treatments: true,
            hazards: true,
          },
        },
      },
    });

    if (!risk) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 });
    }

    return NextResponse.json(risk);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS risk');
    return NextResponse.json({ error: 'Failed to fetch risk' }, { status: 500 });
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

    const existing = await prisma.imsRisk.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, riskNumber: true, reviewFrequencyDays: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      titleAr,
      category,
      type,
      description,
      source,
      applicableStandards,
      ownerId,
      departmentId,
      status,
      reviewFrequencyDays,
    } = body;

    const updateData: Record<string, unknown> = { updatedById: session.sub };

    if (title !== undefined) updateData.title = title;
    if (titleAr !== undefined) updateData.titleAr = titleAr;
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (source !== undefined) updateData.source = source;
    if (applicableStandards !== undefined) updateData.applicableStandards = applicableStandards;
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (status !== undefined) updateData.status = status;

    if (reviewFrequencyDays !== undefined) {
      updateData.reviewFrequencyDays = reviewFrequencyDays;
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + reviewFrequencyDays);
      updateData.nextReviewDate = nextReviewDate;
    }

    const risk = await prisma.imsRisk.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_RISK_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsRisk',
      entityId: risk.id,
      entityName: risk.riskNumber,
      summary: `IMS risk ${risk.riskNumber} updated`,
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(risk);
  } catch (error) {
    logger.error({ error }, 'Failed to update IMS risk');
    return NextResponse.json({ error: 'Failed to update risk' }, { status: 500 });
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

    const existing = await prisma.imsRisk.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, riskNumber: true, title: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 });
    }

    await prisma.imsRisk.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: session.sub,
      },
    });

    systemEventService.log({
      eventType: 'IMS_RISK_DELETED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsRisk',
      entityId: id,
      entityName: existing.riskNumber,
      summary: `IMS risk ${existing.riskNumber} deleted`,
      details: { riskNumber: existing.riskNumber, title: existing.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete IMS risk');
    return NextResponse.json({ error: 'Failed to delete risk' }, { status: 500 });
  }
}
