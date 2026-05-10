import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { systemEventService } from '@/services/system-events.service';

const CreateSchema = z.object({
  auditId: z.string().uuid().optional().nullable(),
  auditNumber: z.string().optional().nullable(),
  findingType: z.enum(['OFI', 'Observation']),
  processArea: z.enum(['Engineering', 'Supply Chain', 'Projects', 'Sales', 'Production', 'HSE', 'HR', 'Finance', 'Management']),
  description: z.string().min(1),
  potentialBenefit: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  targetReviewDate: z.string().datetime().optional().nullable(),
  status: z.string().default('Open'),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function generateFindingNumber(auditId: string | null | undefined, auditNumber: string | null | undefined): Promise<string> {
  if (auditId && auditNumber) {
    const count = await prisma.imsOfiEntry.count({ where: { auditId } });
    return `${auditNumber}-OFI-${(count + 1).toString().padStart(2, '0')}`;
  }
  const now = new Date();
  const year = now.getFullYear();
  const count = await prisma.imsOfiEntry.count();
  const seq = (count + 1).toString().padStart(3, '0');
  return `OFI-${year}-${seq}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const processArea = searchParams.get('processArea');
    const auditId = searchParams.get('auditId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (processArea) where.processArea = processArea;
    if (auditId) where.auditId = auditId;

    const entries = await prisma.imsOfiEntry.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(entries);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS OFI entries');
    return NextResponse.json({ error: 'Failed to fetch OFI entries' }, { status: 500 });
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
    const findingNumber = await generateFindingNumber(data.auditId, data.auditNumber);

    const entry = await prisma.imsOfiEntry.create({
      data: {
        findingNumber,
        auditId: data.auditId ?? null,
        auditNumber: data.auditNumber ?? null,
        findingType: data.findingType,
        processArea: data.processArea,
        description: data.description,
        potentialBenefit: data.potentialBenefit ?? null,
        assignedToId: data.assignedToId ?? null,
        targetReviewDate: data.targetReviewDate ? new Date(data.targetReviewDate) : null,
        status: data.status,
        notes: data.notes ?? null,
        createdById: session.sub,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_OFI_CREATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsOfiEntry',
      entityId: entry.id,
      entityName: entry.findingNumber,
      summary: `OFI entry ${entry.findingNumber} created`,
      details: { findingNumber: entry.findingNumber, findingType: entry.findingType, processArea: entry.processArea },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create IMS OFI entry');
    return NextResponse.json({ error: 'Failed to create OFI entry' }, { status: 500 });
  }
}
