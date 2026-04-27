import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; distId: string }> }
) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, distId } = await params;

    const document = await prisma.imsDocument.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, documentNumber: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const distribution = await prisma.imsDistribution.findFirst({
      where: { id: distId, documentId: id },
      select: { id: true },
    });

    if (!distribution) {
      return NextResponse.json({ error: 'Distribution not found' }, { status: 404 });
    }

    const recipient = await prisma.imsDistributionRecipient.findFirst({
      where: { distributionId: distId, userId: session.sub },
      select: { id: true, acknowledgedAt: true },
    });

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient record not found for current user' }, { status: 404 });
    }

    if (recipient.acknowledgedAt) {
      return NextResponse.json({ error: 'Already acknowledged' }, { status: 409 });
    }

    const updated = await prisma.imsDistributionRecipient.update({
      where: { id: recipient.id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgeMethod: 'SYSTEM',
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    systemEventService.log({
      eventType: 'KC_ENTRY_UPDATED',
      eventCategory: 'KNOWLEDGE',
      userId: session.sub,
      userName: session.name,
      entityType: 'ImsDistributionRecipient',
      entityId: updated.id,
      entityName: document.documentNumber,
      summary: `Distribution acknowledged for document ${document.documentNumber}`,
      details: { documentId: id, distributionId: distId, acknowledgeMethod: 'SYSTEM' },
    });

    return NextResponse.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to acknowledge IMS distribution');
    return NextResponse.json({ error: 'Failed to acknowledge distribution' }, { status: 500 });
  }
}
