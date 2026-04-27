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

async function generateRiskNumber(type: string): Promise<string> {
  const prefix = type === 'OPPORTUNITY' ? 'OPP' : 'RISK';
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const count = await prisma.imsRisk.count({
    where: {
      type,
      createdAt: { gte: yearStart, lt: yearEnd },
    },
  });

  const sequence = (count + 1).toString().padStart(3, '0');
  return `${prefix}-${year}-${sequence}`;
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
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const currentRiskRating = searchParams.get('currentRiskRating');
    const status = searchParams.get('status');
    const ownerId = searchParams.get('ownerId');
    const standard = searchParams.get('standard');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { deletedAt: null };

    if (type) where.type = type;
    if (category) where.category = category;
    if (currentRiskRating) where.currentRiskRating = currentRiskRating;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    if (search) {
      where.title = { contains: search };
    }

    if (standard) {
      where.applicableStandards = { path: '$', string_contains: standard };
    }

    const risks = await prisma.imsRisk.findMany({
      where,
      select: {
        id: true,
        riskNumber: true,
        type: true,
        title: true,
        titleAr: true,
        description: true,
        source: true,
        applicableStandards: true,
        category: true,
        status: true,
        currentLikelihood: true,
        currentSeverity: true,
        currentRiskLevel: true,
        currentRiskRating: true,
        reviewFrequencyDays: true,
        nextReviewDate: true,
        lastReviewDate: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        _count: {
          select: {
            assessments: true,
            treatments: true,
            hazards: true,
          },
        },
      },
      orderBy: [{ currentRiskLevel: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json(risks);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS risks');
    return NextResponse.json({ error: 'Failed to fetch risks' }, { status: 500 });
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
      titleAr,
      category,
      type,
      description,
      source,
      applicableStandards,
      ownerId,
      departmentId,
      reviewFrequencyDays,
    } = body;

    if (!title || !category || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, type' },
        { status: 400 }
      );
    }

    const riskNumber = await generateRiskNumber(type);

    const days = typeof reviewFrequencyDays === 'number' ? reviewFrequencyDays : 90;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + days);

    const risk = await prisma.imsRisk.create({
      data: {
        riskNumber,
        type,
        title,
        titleAr: titleAr ?? null,
        category,
        description: description ?? null,
        source: source ?? null,
        applicableStandards: applicableStandards ?? null,
        ownerId: ownerId ?? null,
        departmentId: departmentId ?? null,
        reviewFrequencyDays: days,
        nextReviewDate,
        currentLikelihood: 1,
        currentSeverity: 1,
        currentRiskLevel: 1,
        currentRiskRating: 'LOW',
        status: 'OPEN',
        createdById: session.sub,
        updatedById: session.sub,
      },
      include: {
        owner: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_RISK_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsRisk',
      entityId: risk.id,
      entityName: risk.riskNumber,
      summary: `IMS risk ${risk.riskNumber} created: ${risk.title}`,
      details: { riskNumber: risk.riskNumber, type, category, status: 'OPEN' },
    });

    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS risk');
    return NextResponse.json({ error: 'Failed to create risk' }, { status: 500 });
  }
}
