import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  coatingSystem: z.string().min(1),
  coatLayer: z.enum(['PRIMER', 'MID_COAT', 'TOP_COAT', 'SINGLE']),
  surfacePrep: z.string().optional().nullable(),
  ambientTemp: z.number().optional().nullable(),
  relativeHumidity: z.number().optional().nullable(),
  dewPoint: z.number().optional().nullable(),
  nominalDft: z.number().int().optional().nullable(),
  minDft: z.number().int().optional().nullable(),
  maxDft: z.number().int().optional().nullable(),
  readings: z.array(z.object({ point: z.string(), value: z.number() })).optional().nullable(),
  averageDft: z.number().optional().nullable(),
  result: z.enum(['ACCEPTED', 'REJECTED', 'CONDITIONAL']).optional().nullable(),
  inspectorId: z.string().uuid().optional().nullable(),
  inspectionDate: z.string().datetime().optional().nullable(),
  witnessedBy: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  attachments: z.array(z.string()).optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function nextInspectionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.qcCoatingInspection.findFirst({
    where: { inspectionNumber: { startsWith: `COAT-${year}-` } },
    orderBy: { inspectionNumber: 'desc' },
    select: { inspectionNumber: true },
  });
  const n = last ? (parseInt(last.inspectionNumber.split('-')[2]) || 0) + 1 : 1;
  return `COAT-${year}-${String(n).padStart(4, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const result = searchParams.get('result');
    const coatLayer = searchParams.get('coatLayer');

    const where: Record<string, unknown> = { deletedAt: null };
    if (projectId) where.projectId = projectId;
    if (result) where.result = result;
    if (coatLayer) where.coatLayer = coatLayer;

    const records = await prisma.qcCoatingInspection.findMany({
      where,
      select: {
        id: true, inspectionNumber: true, coatingSystem: true, coatLayer: true,
        surfacePrep: true, nominalDft: true, minDft: true, maxDft: true,
        averageDft: true, result: true, inspectionDate: true, witnessedBy: true,
        remarks: true, createdAt: true,
        project: { select: { id: true, projectNumber: true, name: true } },
        inspector: { select: { id: true, name: true } },
      },
      orderBy: { inspectionDate: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch coating inspections');
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
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
    const inspectionNumber = await nextInspectionNumber();

    const record = await prisma.qcCoatingInspection.create({
      data: {
        inspectionNumber,
        projectId: data.projectId ?? null,
        coatingSystem: data.coatingSystem,
        coatLayer: data.coatLayer,
        surfacePrep: data.surfacePrep ?? null,
        ambientTemp: data.ambientTemp ?? null,
        relativeHumidity: data.relativeHumidity ?? null,
        dewPoint: data.dewPoint ?? null,
        nominalDft: data.nominalDft ?? null,
        minDft: data.minDft ?? null,
        maxDft: data.maxDft ?? null,
        readings: data.readings ? JSON.stringify(data.readings) : null,
        averageDft: data.averageDft ?? null,
        result: data.result ?? null,
        inspectorId: data.inspectorId ?? null,
        inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : null,
        witnessedBy: data.witnessedBy ?? null,
        remarks: data.remarks ?? null,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true, inspectionNumber: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create coating inspection');
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}
