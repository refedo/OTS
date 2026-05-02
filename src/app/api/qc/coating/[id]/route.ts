import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  coatingSystem: z.string().min(1).optional(),
  coatLayer: z.enum(['PRIMER', 'MID_COAT', 'TOP_COAT', 'SINGLE']).optional(),
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
    const updated = await prisma.qcCoatingInspection.update({
      where: { id },
      data: {
        ...data,
        inspectionDate: data.inspectionDate !== undefined ? (data.inspectionDate ? new Date(data.inspectionDate) : null) : undefined,
        readings: data.readings !== undefined ? (data.readings ? JSON.stringify(data.readings) : null) : undefined,
        attachments: data.attachments !== undefined ? (data.attachments ? JSON.stringify(data.attachments) : null) : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update coating inspection');
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.qcCoatingInspection.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete coating inspection');
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
