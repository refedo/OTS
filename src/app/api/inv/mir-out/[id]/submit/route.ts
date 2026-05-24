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
      select: { id: true, mirOutNumber: true, status: true, materialType: true },
    });

    if (!mirOut) return NextResponse.json({ error: 'MIR-OUT not found' }, { status: 404 });
    if (mirOut.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT requests can be submitted' }, { status: 422 });
    }
    if (mirOut.materialType !== 'CONSUMABLE') {
      return NextResponse.json({ error: 'Only CONSUMABLE requests go through approval workflow' }, { status: 422 });
    }

    await prisma.invMirOut.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        submittedAt: new Date(),
        submittedById: session.userId,
      },
    });

    await logActivity({
      action: 'UPDATE',
      entityType: 'InvMirOut',
      entityId: id,
      entityName: mirOut.mirOutNumber,
      userId: session.userId,
    });

    logger.info({ mirOutId: id }, '[INV] MIR-OUT submitted for approval');
    return NextResponse.json({ status: 'PENDING_APPROVAL' });
  } catch (error) {
    logger.error({ error }, '[INV] Failed to submit MIR-OUT');
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
