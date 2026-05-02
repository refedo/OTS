import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  employeeName: z.string().min(1),
  department: z.string().optional().nullable(),
  roleTitle: z.string().optional().nullable(),
  competencyGap: z.string().min(1),
  requiredTraining: z.string().min(1),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  targetDate: z.string().datetime().optional().nullable(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']).default('OPEN'),
  responsibleId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const records = await prisma.hrTrainingNeed.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        employeeName: true,
        department: true,
        roleTitle: true,
        competencyGap: true,
        requiredTraining: true,
        priority: true,
        targetDate: true,
        status: true,
        notes: true,
        createdAt: true,
        responsible: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch training needs');
    return NextResponse.json({ error: 'Failed to fetch training needs' }, { status: 500 });
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
    const record = await prisma.hrTrainingNeed.create({
      data: {
        employeeName: data.employeeName,
        department: data.department ?? null,
        roleTitle: data.roleTitle ?? null,
        competencyGap: data.competencyGap,
        requiredTraining: data.requiredTraining,
        priority: data.priority,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        status: data.status,
        responsibleId: data.responsibleId ?? null,
        notes: data.notes ?? null,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create training need');
    return NextResponse.json({ error: 'Failed to create training need' }, { status: 500 });
  }
}
