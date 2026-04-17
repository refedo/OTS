import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const PATCH = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const userId = session!.userId;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const archive = body.archive !== false; // default: archive=true

  try {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId } },
      data: { archivedAt: archive ? new Date() : null },
    });

    return NextResponse.json({ archived: archive });
  } catch (error) {
    logger.error({ error, userId, conversationId: id }, 'Failed to archive conversation');
    return NextResponse.json({ error: 'Failed to archive conversation' }, { status: 500 });
  }
});
