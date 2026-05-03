import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  reviewDate: z.string().datetime().optional(),
  chairperson: z.string().min(1).optional(),
  period: z.string().min(1).optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'LOCKED']).optional(),
  attendees: z.array(z.object({ name: z.string(), role: z.string(), present: z.boolean() })).optional(),
  inputResourceStatus: z.string().optional().nullable(),
  inputCustomerFeedback: z.string().optional().nullable(),
  inputSupplierPerf: z.string().optional().nullable(),
  inputObjectiveStatus: z.unknown().optional().nullable(),
  inputContextChanges: z.string().optional().nullable(),
  inputDesignPerformance: z.string().optional().nullable(),
  inputEnvironmentalPerf: z.string().optional().nullable(),
  inputPreviousActions: z.unknown().optional().nullable(),
  inputOhsPerformance: z.unknown().optional().nullable(),
  inputSalesOrderIntake: z.string().optional().nullable(),
  inputProjectDelivery: z.string().optional().nullable(),
  inputProductionTonnage: z.string().optional().nullable(),
  inputProcurementDelays: z.string().optional().nullable(),
  inputRisksOpportunities: z.string().optional().nullable(),
  inputAdditionalItems: z.array(z.object({ question: z.string(), answer: z.string() })).optional().nullable(),
  outputDecisions: z.array(z.object({
    decision: z.string(),
    responsible: z.string(),
    targetDate: z.string(),
    status: z.string(),
  })).optional(),
  outputObjectives: z.string().optional().nullable(),
  outputResourceNeeds: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).passthrough();

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
    const review = await prisma.imsManagementReview.findFirst({
      where: { id, deletedAt: null },
    });
    if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(review);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch management review');
    return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 });
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

    const existing = await prisma.imsManagementReview.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status === 'LOCKED') return NextResponse.json({ error: 'Review is locked' }, { status: 400 });

    const data = parsed.data;
    const updateData: Record<string, unknown> = { ...data };
    if (data.reviewDate) updateData.reviewDate = new Date(data.reviewDate);
    if (data.status === 'APPROVED') {
      updateData.approvedById = session.sub;
      updateData.approvedAt = new Date();
    }

    const updated = await prisma.imsManagementReview.update({ where: { id }, data: updateData });

    systemEventService.log({
      eventType: 'IMS_MANAGEMENT_REVIEW_UPDATED',
      eventCategory: 'IMS',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsManagementReview',
      entityId: id,
      entityName: updated.reviewNumber,
      summary: `Management review ${updated.reviewNumber} updated — status: ${updated.status}`,
      details: { status: updated.status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update management review');
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.imsManagementReview.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.status === 'LOCKED') return NextResponse.json({ error: 'Cannot delete a locked review' }, { status: 400 });
    await prisma.imsManagementReview.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete management review');
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 });
  }
}
