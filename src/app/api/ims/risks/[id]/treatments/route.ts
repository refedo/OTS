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

    const treatments = await prisma.imsRiskTreatment.findMany({
      where: { riskId: id },
      include: {
        responsible: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(treatments);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS risk treatments');
    return NextResponse.json({ error: 'Failed to fetch treatments' }, { status: 500 });
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
    const { treatmentType, description, responsibleId, targetDate, status } = body;

    if (!treatmentType || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: treatmentType, description' },
        { status: 400 }
      );
    }

    const treatment = await prisma.imsRiskTreatment.create({
      data: {
        riskId: id,
        treatmentType,
        description,
        responsibleId: responsibleId ?? null,
        targetDate: targetDate ? new Date(targetDate) : null,
        status: status ?? 'PLANNED',
      },
      include: {
        responsible: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_RISK_TREATMENT_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsRiskTreatment',
      entityId: treatment.id,
      entityName: risk.riskNumber,
      summary: `Treatment created for risk ${risk.riskNumber}: ${treatmentType}`,
      details: { riskId: id, treatmentType, status: treatment.status },
    });

    return NextResponse.json(treatment, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS risk treatment');
    return NextResponse.json({ error: 'Failed to create treatment' }, { status: 500 });
  }
}
