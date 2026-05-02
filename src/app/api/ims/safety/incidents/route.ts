import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  title: z.string().min(1),
  incidentType: z.enum(['INCIDENT', 'NEAR_MISS', 'FIRST_AID', 'DANGEROUS_OCCURRENCE']),
  incidentDate: z.string().datetime(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  immediateAction: z.string().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  preventiveAction: z.string().optional().nullable(),
  reportedById: z.string().uuid().optional().nullable(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CLOSED']).default('OPEN'),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function nextIncidentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.imsIncident.findFirst({
    where: { incidentNumber: { startsWith: `INC-${year}-` } },
    orderBy: { incidentNumber: 'desc' },
    select: { incidentNumber: true },
  });
  const n = last ? (parseInt(last.incidentNumber.split('-')[2]) || 0) + 1 : 1;
  return `INC-${year}-${String(n).padStart(4, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('incidentType');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { deletedAt: null };
    if (type) where.incidentType = type;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const records = await prisma.imsIncident.findMany({
      where,
      select: {
        id: true, incidentNumber: true, title: true, incidentType: true,
        incidentDate: true, location: true, severity: true, status: true,
        description: true, immediateAction: true, rootCause: true,
        correctiveAction: true, preventiveAction: true, closedAt: true, createdAt: true,
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { incidentDate: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch incidents');
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
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
    const incidentNumber = await nextIncidentNumber();

    const record = await prisma.imsIncident.create({
      data: {
        incidentNumber,
        title: data.title,
        incidentType: data.incidentType,
        incidentDate: new Date(data.incidentDate),
        location: data.location ?? null,
        description: data.description ?? null,
        immediateAction: data.immediateAction ?? null,
        rootCause: data.rootCause ?? null,
        correctiveAction: data.correctiveAction ?? null,
        preventiveAction: data.preventiveAction ?? null,
        reportedById: data.reportedById ?? null,
        severity: data.severity,
        status: data.status,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true, incidentNumber: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create incident');
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
  }
}
