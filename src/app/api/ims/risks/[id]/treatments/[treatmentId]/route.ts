import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; treatmentId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, treatmentId } = await params;

    const existing = await prisma.imsRiskTreatment.findFirst({
      where: { id: treatmentId, riskId: id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Treatment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, effectiveness, completedDate, notes, description, responsibleId, targetDate } =
      body;

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (effectiveness !== undefined) updateData.effectiveness = effectiveness;
    if (completedDate !== undefined)
      updateData.completedDate = completedDate ? new Date(completedDate) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (description !== undefined) updateData.description = description;
    if (responsibleId !== undefined) updateData.responsibleId = responsibleId;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;

    const treatment = await prisma.imsRiskTreatment.update({
      where: { id: treatmentId },
      data: updateData,
      include: {
        responsible: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_RISK_TREATMENT_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsRiskTreatment',
      entityId: treatmentId,
      entityName: treatmentId,
      summary: `Treatment ${treatmentId} updated for risk ${id}`,
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(treatment);
  } catch (error) {
    logger.error({ error }, 'Failed to update IMS risk treatment');
    return NextResponse.json({ error: 'Failed to update treatment' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; treatmentId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, treatmentId } = await params;

    const existing = await prisma.imsRiskTreatment.findFirst({
      where: { id: treatmentId, riskId: id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Treatment not found' }, { status: 404 });
    }

    await prisma.imsRiskTreatment.delete({
      where: { id: treatmentId },
    });

    systemEventService.log({
      eventType: 'IMS_RISK_TREATMENT_DELETED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsRiskTreatment',
      entityId: treatmentId,
      entityName: treatmentId,
      summary: `Treatment ${treatmentId} deleted from risk ${id}`,
      details: { riskId: id, treatmentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete IMS risk treatment');
    return NextResponse.json({ error: 'Failed to delete treatment' }, { status: 500 });
  }
}
