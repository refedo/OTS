import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const PATCH = withApiContext(async (_req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const userId = session!.userId;
  const { id: conversationId } = await params;

  try {
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error, userId, conversationId }, 'Failed to mark conversation as read');
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
});
