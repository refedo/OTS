import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const AddRowSchema = z.object({
  questionId: z.string().uuid().optional().nullable(),
  questionText: z.string().min(1),
  isoClause: z.string().min(1),
  result: z.string().optional().nullable(),
  evidence: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ auditId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { auditId } = await params;

    const checklist = await prisma.imsAuditChecklist.findUnique({
      where: { auditId },
      select: { id: true },
    });

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found for this audit' }, { status: 404 });
    }

    const rows = await prisma.imsAuditChecklistRow.findMany({
      where: { checklistId: checklist.id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(rows);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch checklist rows');
    return NextResponse.json({ error: 'Failed to fetch checklist rows' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ auditId: string }> },
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { auditId } = await params;
    const body = await req.json();
    const parsed = AddRowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Find or create the checklist for this audit
    let checklist = await prisma.imsAuditChecklist.findUnique({
      where: { auditId },
      select: { id: true },
    });

    if (!checklist) {
      checklist = await prisma.imsAuditChecklist.create({
        data: { auditId, createdById: session.sub },
        select: { id: true },
      });
    }

    // If questionId provided, denormalize questionText/isoClause from the master question
    let questionText = data.questionText;
    let isoClause = data.isoClause;
    if (data.questionId) {
      const question = await prisma.imsChecklistQuestion.findUnique({
        where: { id: data.questionId },
        select: { questionText: true, isoClause: true },
      });
      if (question) {
        questionText = question.questionText;
        isoClause = question.isoClause;
      }
    }

    const row = await prisma.imsAuditChecklistRow.create({
      data: {
        checklistId: checklist.id,
        questionId: data.questionId ?? null,
        questionText,
        isoClause,
        result: data.result ?? null,
        evidence: data.evidence ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to add checklist row');
    return NextResponse.json({ error: 'Failed to add checklist row' }, { status: 500 });
  }
}
