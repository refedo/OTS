import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const workflowSchema = z.object({
  inspectionIds: z.array(z.string().min(1)).min(1),
  action: z.enum(['submit', 'approve', 'reject']),
  notes: z.string().optional(),
});

// Transitions:
//   Draft          → PendingApproval (action: 'submit')
//   PendingApproval → Approved       (action: 'approve')
//   PendingApproval → Rejected       (action: 'reject')
//   Rejected        → PendingApproval (action: 'submit' again to re-submit)

export async function POST(request: Request) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = workflowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { inspectionIds, action, notes } = parsed.data;

    const inspections = await prisma.dimensionalInspection.findMany({
      where: { id: { in: inspectionIds } },
      select: { id: true, approvalStatus: true, inspectionNumber: true },
    });

    if (inspections.length === 0) {
      return NextResponse.json({ error: 'No inspections found' }, { status: 404 });
    }

    let nextStatus: string;
    const updateData: Record<string, unknown> = {};

    if (action === 'submit') {
      nextStatus = 'PendingApproval';
      updateData.approvalStatus = nextStatus;
      if (notes) updateData.approvalNotes = notes;
    } else if (action === 'approve') {
      nextStatus = 'Approved';
      updateData.approvalStatus = nextStatus;
      updateData.approvedById = session.sub;
      if (notes) updateData.approvalNotes = notes;
    } else {
      nextStatus = 'Rejected';
      updateData.approvalStatus = nextStatus;
      updateData.approvalNotes = notes || null;
    }

    await prisma.dimensionalInspection.updateMany({
      where: { id: { in: inspectionIds } },
      data: updateData,
    });

    logger.info(
      { userId: session.sub, action, inspectionIds, nextStatus },
      'Dimensional inspection workflow transition'
    );

    return NextResponse.json({ success: true, status: nextStatus, count: inspections.length });
  } catch (error) {
    logger.error({ error }, 'Error processing dimensional inspection workflow');
    return NextResponse.json(
      { error: 'Failed to process workflow action' },
      { status: 500 }
    );
  }
}
