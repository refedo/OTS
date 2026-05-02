import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  incidentType: z.enum(['INCIDENT', 'NEAR_MISS', 'FIRST_AID', 'DANGEROUS_OCCURRENCE']).optional(),
  incidentDate: z.string().datetime().optional(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  immediateAction: z.string().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  preventiveAction: z.string().optional().nullable(),
  reportedById: z.string().uuid().optional().nullable(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'UNDER_INVESTIGATION', 'CLOSED']).optional(),
  closedAt: z.string().datetime().optional().nullable(),
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
    const updated = await prisma.imsIncident.update({
      where: { id },
      data: {
        ...data,
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : undefined,
        closedAt: data.closedAt !== undefined ? (data.closedAt ? new Date(data.closedAt) : null) : undefined,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update incident');
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.imsIncident.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete incident');
    return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 });
  }
}
