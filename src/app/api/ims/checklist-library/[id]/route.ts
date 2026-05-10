import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const UpdateSchema = z.object({
  questionText: z.string().min(5).optional(),
  processArea: z
    .enum([
      'Engineering',
      'Supply Chain',
      'Projects',
      'Sales',
      'Production',
      'HSE',
      'HR',
      'Finance',
      'Management',
    ])
    .optional(),
  isoClause: z.string().min(1).optional(),
  evidenceType: z.enum(['Record', 'Document', 'Observation', 'Interview']).optional(),
  riskLevel: z.enum(['High', 'Medium', 'Low']).optional(),
  isActive: z.boolean().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const question = await prisma.imsChecklistQuestion.update({
      where: { id },
      data: parsed.data,
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
      eventType: 'IMS_CHECKLIST_QUESTION_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsChecklistQuestion',
      entityId: question.id,
      entityName: question.questionText.slice(0, 80),
      summary: `Checklist question updated — ${question.processArea} / ${question.isoClause}`,
      details: { updatedFields: Object.keys(parsed.data) },
    });

    return NextResponse.json(question);
  } catch (error) {
    logger.error({ error }, 'Failed to update checklist question');
    return NextResponse.json({ error: 'Failed to update checklist question' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const question = await prisma.imsChecklistQuestion.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, questionText: true, processArea: true, isoClause: true },
    });

    systemEventService.log({
      eventType: 'IMS_CHECKLIST_QUESTION_DEACTIVATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsChecklistQuestion',
      entityId: question.id,
      entityName: question.questionText.slice(0, 80),
      summary: `Checklist question deactivated — ${question.processArea} / ${question.isoClause}`,
      details: { id: question.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to deactivate checklist question');
    return NextResponse.json({ error: 'Failed to deactivate checklist question' }, { status: 500 });
  }
}
