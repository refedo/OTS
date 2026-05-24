import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { logActivity } from '@/lib/api-utils';

const RejectSchema = z.object({
  reason: z.string().min(5, 'Rejection reason is required (min 5 characters)'),
});

async function getSession() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  return token ? verifySession(token) : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = RejectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
    }

    const mirOut = await prisma.invMirOut.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, mirOutNumber: true, status: true },
    });

    if (!mirOut) return NextResponse.json({ error: 'MIR-OUT not found' }, { status: 404 });

    const rejectable = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'];
    if (!rejectable.includes(mirOut.status)) {
      return NextResponse.json({ error: `Cannot reject a MIR-OUT in status: ${mirOut.status}` }, { status: 422 });
    }

    await prisma.invMirOut.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedById: session.userId,
        rejectionReason: parsed.data.reason,
      },
    });

    await logActivity({
      action: 'REJECT',
      entityType: 'InvMirOut',
      entityId: id,
      entityName: mirOut.mirOutNumber,
      userId: session.userId,
      reason: parsed.data.reason,
    });

    logger.info({ mirOutId: id }, '[INV] MIR-OUT rejected');
    return NextResponse.json({ status: 'REJECTED' });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to reject MIR-OUT');
    return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
  }
}
