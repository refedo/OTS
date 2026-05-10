import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { systemEventService } from '@/services/system-events.service';

const UpdateSchema = z.object({
  linkedNcrId: z.string().uuid().optional().nullable(),
  linkedNcrNumber: z.string().optional().nullable(),
  ncStatement: z.string().optional().nullable(),
  rootCauseMethod: z.enum(['5-Why', 'Ishikawa', 'Direct statement']).optional().nullable(),
  rootCauseText: z.string().optional().nullable(),
  actionPlan: z.string().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  status: z.string().optional(),
  verificationDate: z.string().datetime().optional().nullable(),
  verificationMethod: z.string().optional().nullable(),
  verificationResult: z.string().optional().nullable(),
  verifiedByName: z.string().optional().nullable(),
  verifiedById: z.string().uuid().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const record = await prisma.imsCarRecord.findUnique({
      where: { id },
      include: {
        progressLogs: { orderBy: { date: 'asc' } },
        responsible: { select: { id: true, name: true } },
      },
    });

    if (!record) return NextResponse.json({ error: 'CAR record not found' }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS CAR record');
    return NextResponse.json({ error: 'Failed to fetch CAR record' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.linkedNcrId !== undefined) updateData.linkedNcrId = data.linkedNcrId;
    if (data.linkedNcrNumber !== undefined) updateData.linkedNcrNumber = data.linkedNcrNumber;
    if (data.ncStatement !== undefined) updateData.ncStatement = data.ncStatement;
    if (data.rootCauseMethod !== undefined) updateData.rootCauseMethod = data.rootCauseMethod;
    if (data.rootCauseText !== undefined) updateData.rootCauseText = data.rootCauseText;
    if (data.actionPlan !== undefined) updateData.actionPlan = data.actionPlan;
    if (data.responsibleId !== undefined) updateData.responsibleId = data.responsibleId;
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? new Date(data.targetDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.verificationDate !== undefined) updateData.verificationDate = data.verificationDate ? new Date(data.verificationDate) : null;
    if (data.verificationMethod !== undefined) updateData.verificationMethod = data.verificationMethod;
    if (data.verificationResult !== undefined) updateData.verificationResult = data.verificationResult;
    if (data.verifiedByName !== undefined) updateData.verifiedByName = data.verifiedByName;
    if (data.verifiedById !== undefined) updateData.verifiedById = data.verifiedById;

    const record = await prisma.imsCarRecord.update({
      where: { id },
      data: updateData,
      include: {
        progressLogs: { orderBy: { date: 'asc' } },
        responsible: { select: { id: true, name: true } },
      },
    });

    // If status changed to 'Verified Effective' and there's a linked NCR, close it
    if (data.status === 'Verified Effective' && record.linkedNcrId) {
      await prisma.imsNcr.update({
        where: { id: record.linkedNcrId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedById: session.sub,
        },
      });
    }

    systemEventService.log({
      eventType: 'IMS_CAR_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsCarRecord',
      entityId: record.id,
      entityName: record.carNumber,
      summary: `CAR record ${record.carNumber} updated`,
      details: { carNumber: record.carNumber, status: record.status },
    });

    return NextResponse.json(record);
  } catch (error) {
    logger.error({ error }, 'Failed to update IMS CAR record');
    return NextResponse.json({ error: 'Failed to update CAR record' }, { status: 500 });
  }
}
