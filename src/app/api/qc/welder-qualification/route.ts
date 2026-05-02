import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSchema = z.object({
  welderName: z.string().min(1),
  welderCode: z.string().optional().nullable(),
  weldingProcess: z.enum(['SMAW', 'GMAW', 'GTAW', 'SAW', 'FCAW']),
  position: z.string().optional().nullable(),
  baseMaterial: z.string().optional().nullable(),
  fillMaterial: z.string().optional().nullable(),
  thickness: z.string().optional().nullable(),
  diameter: z.string().optional().nullable(),
  testDate: z.string().datetime().optional().nullable(),
  testLocation: z.string().optional().nullable(),
  inspectorId: z.string().uuid().optional().nullable(),
  visualResult: z.enum(['PASS', 'FAIL']).optional().nullable(),
  bendTestResult: z.enum(['PASS', 'FAIL', 'NA']).optional().nullable(),
  radiographyResult: z.enum(['PASS', 'FAIL', 'NA']).optional().nullable(),
  overallResult: z.enum(['QUALIFIED', 'NOT_QUALIFIED']).default('NOT_QUALIFIED'),
  qualificationRange: z.string().optional().nullable(),
  certificationNumber: z.string().optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  renewalDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

async function nextWqtNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.qcWelderQualification.findFirst({
    where: { wqtNumber: { startsWith: `WQT-${year}-` } },
    orderBy: { wqtNumber: 'desc' },
    select: { wqtNumber: true },
  });
  const n = last ? (parseInt(last.wqtNumber.split('-')[2]) || 0) + 1 : 1;
  return `WQT-${year}-${String(n).padStart(4, '0')}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const process_ = searchParams.get('weldingProcess');
    const result = searchParams.get('overallResult');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { deletedAt: null };
    if (process_) where.weldingProcess = process_;
    if (result) where.overallResult = result;
    if (search) where.welderName = { contains: search };

    const records = await prisma.qcWelderQualification.findMany({
      where,
      select: {
        id: true, wqtNumber: true, welderName: true, welderCode: true,
        weldingProcess: true, position: true, testDate: true,
        visualResult: true, bendTestResult: true, radiographyResult: true,
        overallResult: true, certificationNumber: true, validFrom: true,
        expiryDate: true, renewalDate: true, notes: true, createdAt: true,
        inspector: { select: { id: true, name: true } },
      },
      orderBy: { testDate: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch welder qualifications');
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
    const wqtNumber = await nextWqtNumber();

    const record = await prisma.qcWelderQualification.create({
      data: {
        wqtNumber,
        welderName: data.welderName,
        welderCode: data.welderCode ?? null,
        weldingProcess: data.weldingProcess,
        position: data.position ?? null,
        baseMaterial: data.baseMaterial ?? null,
        fillMaterial: data.fillMaterial ?? null,
        thickness: data.thickness ?? null,
        diameter: data.diameter ?? null,
        testDate: data.testDate ? new Date(data.testDate) : null,
        testLocation: data.testLocation ?? null,
        inspectorId: data.inspectorId ?? null,
        visualResult: data.visualResult ?? null,
        bendTestResult: data.bendTestResult ?? null,
        radiographyResult: data.radiographyResult ?? null,
        overallResult: data.overallResult,
        qualificationRange: data.qualificationRange ?? null,
        certificationNumber: data.certificationNumber ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
        notes: data.notes ?? null,
        createdById: session.userId,
        updatedAt: new Date(),
      },
      select: { id: true, wqtNumber: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Failed to create welder qualification');
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 });
  }
}
