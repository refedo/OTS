import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { systemEventService } from '@/services/system-events.service';

const UpdateSchema = z.object({
  auditId: z.string().uuid().optional().nullable(),
  auditNumber: z.string().optional().nullable(),
  findingType: z.enum(['OFI', 'Observation']).optional(),
  processArea: z.enum(['Engineering', 'Supply Chain', 'Projects', 'Sales', 'Production', 'HSE', 'HR', 'Finance', 'Management']).optional(),
  description: z.string().min(1).optional(),
  potentialBenefit: z.string().optional().nullable(),
  assignedToId: z.string().uuid().optional().nullable(),
  targetReviewDate: z.string().datetime().optional().nullable(),
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const entry = await prisma.imsOfiEntry.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (!entry) return NextResponse.json({ error: 'OFI entry not found' }, { status: 404 });
    return NextResponse.json(entry);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch IMS OFI entry');
    return NextResponse.json({ error: 'Failed to fetch OFI entry' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.auditId !== undefined) updateData.auditId = data.auditId;
    if (data.auditNumber !== undefined) updateData.auditNumber = data.auditNumber;
    if (data.findingType !== undefined) updateData.findingType = data.findingType;
    if (data.processArea !== undefined) updateData.processArea = data.processArea;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.potentialBenefit !== undefined) updateData.potentialBenefit = data.potentialBenefit;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.targetReviewDate !== undefined) updateData.targetReviewDate = data.targetReviewDate ? new Date(data.targetReviewDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const entry = await prisma.imsOfiEntry.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    systemEventService.log({
      eventType: 'IMS_OFI_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsOfiEntry',
      entityId: entry.id,
      entityName: entry.findingNumber,
      summary: `OFI entry ${entry.findingNumber} updated`,
      details: { findingNumber: entry.findingNumber, status: entry.status },
    });

    return NextResponse.json(entry);
  } catch (error) {
    logger.error({ error }, 'Failed to update IMS OFI entry');
    return NextResponse.json({ error: 'Failed to update OFI entry' }, { status: 500 });
  }
}
