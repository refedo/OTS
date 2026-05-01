import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

const UpdateSchema = z.object({
  title: z.string().min(1).optional(),
  standard: z.string().min(1).optional(),
  isoStandard: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  applicableTo: z.string().min(1).optional(),
  complianceStatus: z.string().min(1).optional(),
  reviewFrequency: z.string().min(1).optional(),
  lastReviewedAt: z.string().datetime().optional().nullable(),
  nextReviewDue: z.string().datetime().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  evidenceInOts: z.string().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const record = await prisma.imsLegalRegister.findFirst({
      where: { id, deletedAt: null },
      include: { responsible: { select: { id: true, name: true } } },
    });
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(record);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch legal register entry');
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
  }
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
    const updated = await prisma.imsLegalRegister.update({
      where: { id },
      data: {
        ...data,
        lastReviewedAt: data.lastReviewedAt !== undefined
          ? (data.lastReviewedAt ? new Date(data.lastReviewedAt) : null) : undefined,
        nextReviewDue: data.nextReviewDue !== undefined
          ? (data.nextReviewDue ? new Date(data.nextReviewDue) : null) : undefined,
        updatedById: session.sub,
      },
    });

    systemEventService.log({
      eventType: 'IMS_LEGAL_REGISTER_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsLegalRegister',
      entityId: id,
      entityName: updated.referenceNumber,
      summary: `Legal register entry ${updated.referenceNumber} updated`,
      details: { complianceStatus: updated.complianceStatus },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update legal register entry');
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await prisma.imsLegalRegister.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: session.sub },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete legal register entry');
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
