import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  welderName: z.string().min(1).optional(),
  welderCode: z.string().optional().nullable(),
  weldingProcess: z.enum(['SMAW', 'GMAW', 'GTAW', 'SAW', 'FCAW']).optional(),
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
  overallResult: z.enum(['QUALIFIED', 'NOT_QUALIFIED']).optional(),
  qualificationRange: z.string().optional().nullable(),
  certificationNumber: z.string().optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  renewalDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const updated = await prisma.qcWelderQualification.update({
      where: { id },
      data: {
        ...data,
        testDate: data.testDate !== undefined ? (data.testDate ? new Date(data.testDate) : null) : undefined,
        validFrom: data.validFrom !== undefined ? (data.validFrom ? new Date(data.validFrom) : null) : undefined,
        expiryDate: data.expiryDate !== undefined ? (data.expiryDate ? new Date(data.expiryDate) : null) : undefined,
        renewalDate: data.renewalDate !== undefined ? (data.renewalDate ? new Date(data.renewalDate) : null) : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update welder qualification');
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.qcWelderQualification.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete welder qualification');
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
