import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  drillType: z.enum(['FIRE_EVACUATION', 'FIRST_AID', 'CHEMICAL_SPILL', 'GENERAL', 'OTHER']),
  scheduledDate: z.string().datetime().optional().nullable(),
  conductedDate: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  participantCount: z.number().int().optional().nullable(),
  objectives: z.string().optional().nullable(),
  findings: z.string().optional().nullable(),
  correctiveActions: z.string().optional().nullable(),
  conductedById: z.string().uuid().optional().nullable(),
  status: z.enum(['PLANNED', 'COMPLETED', 'CANCELLED']).default('PLANNED'),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function nextDrillNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.imsEmergencyDrill.findFirst({
    where: { drillNumber: { startsWith: `DRILL-${year}-` } },
    orderBy: { drillNumber: 'desc' },
    select: { drillNumber: true },
  });
  const n = last ? (parseInt(last.drillNumber.split('-')[2]) || 0) + 1 : 1;
  return `DRILL-${year}-${String(n).padStart(4, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('drillType');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { deletedAt: null };
    if (type) where.drillType = type;
    if (status) where.status = status;

    const records = await prisma.imsEmergencyDrill.findMany({
      where,
      select: {
        id: true, drillNumber: true, drillType: true, scheduledDate: true,
        conductedDate: true, location: true, participantCount: true,
        objectives: true, findings: true, correctiveActions: true,
        status: true, notes: true, createdAt: true,
        conductedBy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch drills');
    return NextResponse.json({ error: 'Failed to fetch drills' }, { status: 500 });
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
    const drillNumber = await nextDrillNumber();

    const record = await prisma.imsEmergencyDrill.create({
      data: {
        drillNumber,
        drillType: data.drillType,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        conductedDate: data.conductedDate ? new Date(data.conductedDate) : null,
        location: data.location ?? null,
        participantCount: data.participantCount ?? null,
        objectives: data.objectives ?? null,
        findings: data.findings ?? null,
        correctiveActions: data.correctiveActions ?? null,
        conductedById: data.conductedById ?? null,
        status: data.status,
        notes: data.notes ?? null,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true, drillNumber: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create drill');
    return NextResponse.json({ error: 'Failed to create drill' }, { status: 500 });
  }
}
