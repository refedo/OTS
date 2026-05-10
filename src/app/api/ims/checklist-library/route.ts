import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const CreateSchema = z.object({
  questionText: z.string().min(5),
  processArea: z.enum([
    'Engineering',
    'Supply Chain',
    'Projects',
    'Sales',
    'Production',
    'HSE',
    'HR',
    'Finance',
    'Management',
  ]),
  isoClause: z.string().min(1),
  evidenceType: z.enum(['Record', 'Document', 'Observation', 'Interview']),
  riskLevel: z.enum(['High', 'Medium', 'Low']).default('Medium'),
  isActive: z.boolean().default(true),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const processArea = searchParams.get('processArea');
    const activeOnly = searchParams.get('activeOnly');

    const where: Record<string, unknown> = {};
    if (processArea) where.processArea = processArea;
    if (activeOnly === 'true') where.isActive = true;

    const questions = await prisma.imsChecklistQuestion.findMany({
      where,
      select: {
        id: true,
        questionText: true,
        processArea: true,
        isoClause: true,
        evidenceType: true,
        riskLevel: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ processArea: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(questions);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch checklist questions');
    return NextResponse.json({ error: 'Failed to fetch checklist questions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const question = await prisma.imsChecklistQuestion.create({
      data: {
        questionText: data.questionText,
        processArea: data.processArea,
        isoClause: data.isoClause,
        evidenceType: data.evidenceType,
        riskLevel: data.riskLevel,
        isActive: data.isActive,
        createdById: session.sub,
      },
      select: {
        id: true,
        questionText: true,
        processArea: true,
        isoClause: true,
        evidenceType: true,
        riskLevel: true,
        isActive: true,
        createdAt: true,
      },
    });

    systemEventService.log({
      eventType: 'IMS_CHECKLIST_QUESTION_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsChecklistQuestion',
      entityId: question.id,
      entityName: question.questionText.slice(0, 80),
      summary: `Checklist question created — ${question.processArea} / ${question.isoClause}`,
      details: { processArea: question.processArea, isoClause: question.isoClause, evidenceType: question.evidenceType },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create checklist question');
    return NextResponse.json({ error: 'Failed to create checklist question' }, { status: 500 });
  }
}
