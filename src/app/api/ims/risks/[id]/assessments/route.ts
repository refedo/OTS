import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

function computeRiskRating(riskLevel: number): string {
  if (riskLevel <= 4) return 'LOW';
  if (riskLevel <= 9) return 'MEDIUM';
  if (riskLevel <= 15) return 'HIGH';
  return 'CRITICAL';
}

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

    const assessments = await prisma.imsRiskAssessment.findMany({
      where: { riskId: id },
      include: {
        assessedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS risk assessments');
    return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
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
      select: { id: true, riskNumber: true, reviewFrequencyDays: true },
    });

    if (!risk) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 });
    }

    const body = await request.json();
    const { likelihood, severity, assessmentType, existingControls, recommendations } = body;

    if (
      typeof likelihood !== 'number' ||
      typeof severity !== 'number' ||
      !assessmentType
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: likelihood, severity, assessmentType' },
        { status: 400 }
      );
    }

    if (likelihood < 1 || likelihood > 5 || severity < 1 || severity > 5) {
      return NextResponse.json(
        { error: 'likelihood and severity must be between 1 and 5' },
        { status: 400 }
      );
    }

    const riskLevel = likelihood * severity;
    const riskRating = computeRiskRating(riskLevel);

    const assessment = await prisma.imsRiskAssessment.create({
      data: {
        riskId: id,
        likelihood,
        severity,
        riskLevel,
        riskRating,
        assessmentType,
        existingControls: existingControls ?? null,
        recommendations: recommendations ?? null,
        assessedById: session.sub,
      },
      include: {
        assessedBy: { select: { id: true, name: true } },
      },
    });

    const now = new Date();
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + risk.reviewFrequencyDays);

    await prisma.imsRisk.update({
      where: { id },
      data: {
        currentLikelihood: likelihood,
        currentSeverity: severity,
        currentRiskLevel: riskLevel,
        currentRiskRating: riskRating,
        lastReviewDate: now,
        nextReviewDate,
        updatedById: session.sub,
      },
    });

    systemEventService.log({
      eventType: 'IMS_RISK_ASSESSED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsRiskAssessment',
      entityId: assessment.id,
      entityName: risk.riskNumber,
      summary: `Risk ${risk.riskNumber} assessed: ${riskRating} (${riskLevel})`,
      details: { likelihood, severity, riskLevel, riskRating, assessmentType },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS risk assessment');
    return NextResponse.json({ error: 'Failed to create assessment' }, { status: 500 });
  }
}
