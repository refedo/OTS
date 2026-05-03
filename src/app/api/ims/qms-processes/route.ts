import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  processNumber: z.string().min(1),
  name: z.string().min(1),
  processOwner: z.string().optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  processType: z.enum(['CORE', 'SUPPORT', 'OUTSOURCED', 'IN_HOUSE']).default('CORE'),
  inputs: z.string().optional().nullable(),
  outputs: z.string().optional().nullable(),
  kpis: z.string().optional().nullable(),
  relatedDocumentNumbers: z.string().optional().nullable(),
  isoClause: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'UNDER_REVIEW', 'OBSOLETE']).default('ACTIVE'),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function nextProcessNumber(): Promise<string> {
  const last = await prisma.imsQmsProcess.findFirst({
    where: { processNumber: { startsWith: 'PROC-' } },
    orderBy: { processNumber: 'desc' },
    select: { processNumber: true },
  });
  const n = last ? (parseInt(last.processNumber.replace('PROC-', '')) || 0) + 1 : 1;
  return `PROC-${String(n).padStart(3, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const processType = searchParams.get('processType');

    const records = await prisma.imsQmsProcess.findMany({
      where: {
        deletedAt: null,
        ...(processType ? { processType } : {}),
      },
      select: {
        id: true, processNumber: true, name: true, processOwner: true,
        processType: true, inputs: true, outputs: true, kpis: true,
        relatedDocumentNumbers: true, isoClause: true, status: true, notes: true, createdAt: true,
        owner: { select: { id: true, name: true } },
      },
      orderBy: { processNumber: 'asc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch QMS processes');
    return NextResponse.json({ error: 'Failed to fetch processes' }, { status: 500 });
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
    const processNumber = data.processNumber || await nextProcessNumber();

    const record = await prisma.imsQmsProcess.create({
      data: {
        processNumber,
        name: data.name,
        processOwner: data.processOwner ?? null,
        ownerId: data.ownerId ?? null,
        processType: data.processType,
        inputs: data.inputs ?? null,
        outputs: data.outputs ?? null,
        kpis: data.kpis ?? null,
        relatedDocumentNumbers: data.relatedDocumentNumbers ?? null,
        isoClause: data.isoClause ?? null,
        status: data.status,
        notes: data.notes ?? null,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true, processNumber: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create QMS process');
    return NextResponse.json({ error: 'Failed to create process' }, { status: 500 });
  }
}
