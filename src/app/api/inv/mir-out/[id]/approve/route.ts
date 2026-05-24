import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { logActivity } from '@/lib/api-utils';

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

    const mirOut = await prisma.invMirOut.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, mirOutNumber: true, status: true },
    });

    if (!mirOut) return NextResponse.json({ error: 'MIR-OUT not found' }, { status: 404 });
    if (mirOut.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'Only PENDING_APPROVAL requests can be approved' }, { status: 422 });
    }

    await prisma.invMirOut.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: session.userId,
      },
    });

    await logActivity({
      action: 'APPROVE',
      entityType: 'InvMirOut',
      entityId: id,
      entityName: mirOut.mirOutNumber,
      userId: session.userId,
    });

    logger.info({ mirOutId: id }, '[INV] MIR-OUT approved');
    return NextResponse.json({ status: 'APPROVED' });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to approve MIR-OUT');
    return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
  }
}
