import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; hazardId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, hazardId } = await params;

    const existing = await prisma.imsHazardIdentification.findFirst({
      where: { id: hazardId, riskId: id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Hazard not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      hazardType,
      controlHierarchy,
      hazardDescription,
      location,
      affectedPersonnel,
      controlMeasures,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (hazardType !== undefined) updateData.hazardType = hazardType;
    if (controlHierarchy !== undefined) updateData.controlHierarchy = controlHierarchy;
    if (hazardDescription !== undefined) updateData.hazardDescription = hazardDescription;
    if (location !== undefined) updateData.location = location;
    if (affectedPersonnel !== undefined) updateData.affectedPersonnel = affectedPersonnel;
    if (controlMeasures !== undefined) updateData.controlMeasures = controlMeasures;

    const hazard = await prisma.imsHazardIdentification.update({
      where: { id: hazardId },
      data: updateData,
    });

    systemEventService.log({
      eventType: 'IMS_HAZARD_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsHazardIdentification',
      entityId: hazardId,
      entityName: hazardId,
      summary: `Hazard ${hazardId} updated for risk ${id}`,
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json(hazard);
  } catch (error) {
    logger.error({ error }, 'Failed to update IMS hazard');
    return NextResponse.json({ error: 'Failed to update hazard' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; hazardId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, hazardId } = await params;

    const existing = await prisma.imsHazardIdentification.findFirst({
      where: { id: hazardId, riskId: id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Hazard not found' }, { status: 404 });
    }

    await prisma.imsHazardIdentification.delete({
      where: { id: hazardId },
    });

    systemEventService.log({
      eventType: 'IMS_HAZARD_DELETED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsHazardIdentification',
      entityId: hazardId,
      entityName: hazardId,
      summary: `Hazard ${hazardId} deleted from risk ${id}`,
      details: { riskId: id, hazardId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete IMS hazard');
    return NextResponse.json({ error: 'Failed to delete hazard' }, { status: 500 });
  }
}
