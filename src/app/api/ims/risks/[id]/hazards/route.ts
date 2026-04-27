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
      select: { id: true },
    });

    if (!risk) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 });
    }

    const hazards = await prisma.imsHazardIdentification.findMany({
      where: { riskId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(hazards);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS hazards');
    return NextResponse.json({ error: 'Failed to fetch hazards' }, { status: 500 });
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

    const risk = await prisma.imsRisk.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, riskNumber: true },
    });

    if (!risk) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 });
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

    if (!hazardType || !controlHierarchy) {
      return NextResponse.json(
        { error: 'Missing required fields: hazardType, controlHierarchy' },
        { status: 400 }
      );
    }

    const hazard = await prisma.imsHazardIdentification.create({
      data: {
        riskId: id,
        hazardType,
        controlHierarchy,
        hazardDescription: hazardDescription ?? null,
        location: location ?? null,
        affectedPersonnel: affectedPersonnel ?? null,
        controlMeasures: controlMeasures ?? null,
      },
    });

    systemEventService.log({
      eventType: 'IMS_HAZARD_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsHazardIdentification',
      entityId: hazard.id,
      entityName: risk.riskNumber,
      summary: `Hazard identified for risk ${risk.riskNumber}: ${hazardType}`,
      details: { riskId: id, hazardType, controlHierarchy },
    });

    return NextResponse.json(hazard, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS hazard');
    return NextResponse.json({ error: 'Failed to create hazard' }, { status: 500 });
  }
}
