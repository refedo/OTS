import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { systemEventService } from '@/services/system-events.service';

const CreateSchema = z.object({
  linkedNcrId: z.string().uuid().optional().nullable(),
  linkedNcrNumber: z.string().optional().nullable(),
  ncStatement: z.string().optional().nullable(),
  rootCauseMethod: z.enum(['5-Why', 'Ishikawa', 'Direct statement']).optional().nullable(),
  rootCauseText: z.string().optional().nullable(),
  actionPlan: z.string().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  status: z.string().default('Draft'),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function generateCarNumber(): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const count = await prisma.imsCarRecord.count();
  const seq = (count + 1).toString().padStart(3, '0');
  return `CAR-${yy}${mm}-${seq}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const linkedNcrId = searchParams.get('linkedNcrId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (linkedNcrId) where.linkedNcrId = linkedNcrId;

    const records = await prisma.imsCarRecord.findMany({
      where,
      include: {
        progressLogs: { orderBy: { date: 'asc' } },
        responsible: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS CAR records');
    return NextResponse.json({ error: 'Failed to fetch CAR records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const carNumber = await generateCarNumber();

    const record = await prisma.imsCarRecord.create({
      data: {
        carNumber,
        linkedNcrId: data.linkedNcrId ?? null,
        linkedNcrNumber: data.linkedNcrNumber ?? null,
        ncStatement: data.ncStatement ?? null,
        rootCauseMethod: data.rootCauseMethod ?? null,
        rootCauseText: data.rootCauseText ?? null,
        actionPlan: data.actionPlan ?? null,
        responsibleId: data.responsibleId ?? null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        status: data.status,
        createdById: session.sub,
      },
      include: {
        progressLogs: { orderBy: { date: 'asc' } },
        responsible: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_CAR_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsCarRecord',
      entityId: record.id,
      entityName: record.carNumber,
      summary: `CAR record ${record.carNumber} created`,
      details: { carNumber: record.carNumber, status: record.status },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS CAR record');
    return NextResponse.json({ error: 'Failed to create CAR record' }, { status: 500 });
  }
}
