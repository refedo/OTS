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

    const ret = await prisma.invReturn.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, returnNumber: true, status: true },
    });

    if (!ret) return NextResponse.json({ error: 'Return not found' }, { status: 404 });
    if (ret.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only PENDING returns can be rejected' }, { status: 422 });
    }

    await prisma.invReturn.update({
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
      entityType: 'InvReturn',
      entityId: id,
      entityName: ret.returnNumber,
      userId: session.userId,
      reason: parsed.data.reason,
    });

    logger.info({ returnId: id }, '[INV] Return rejected');
    return NextResponse.json({ status: 'REJECTED' });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to reject return');
    return NextResponse.json({ error: 'Failed to reject return' }, { status: 500 });
  }
}
