import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  drillType: z.enum(['FIRE_EVACUATION', 'FIRST_AID', 'CHEMICAL_SPILL', 'GENERAL', 'OTHER']).optional(),
  scheduledDate: z.string().datetime().optional().nullable(),
  conductedDate: z.string().datetime().optional().nullable(),
  location: z.string().optional().nullable(),
  participantCount: z.number().int().optional().nullable(),
  objectives: z.string().optional().nullable(),
  findings: z.string().optional().nullable(),
  correctiveActions: z.string().optional().nullable(),
  conductedById: z.string().uuid().optional().nullable(),
  status: z.enum(['PLANNED', 'COMPLETED', 'CANCELLED']).optional(),
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
    const updated = await prisma.imsEmergencyDrill.update({
      where: { id },
      data: {
        ...data,
        scheduledDate: data.scheduledDate !== undefined ? (data.scheduledDate ? new Date(data.scheduledDate) : null) : undefined,
        conductedDate: data.conductedDate !== undefined ? (data.conductedDate ? new Date(data.conductedDate) : null) : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update drill');
    return NextResponse.json({ error: 'Failed to update drill' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.imsEmergencyDrill.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete drill');
    return NextResponse.json({ error: 'Failed to delete drill' }, { status: 500 });
  }
}
