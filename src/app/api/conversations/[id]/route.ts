import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const DELETE = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const userId = session!.userId;
  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, createdById: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.createdById !== userId) {
      return NextResponse.json({ error: 'Only the conversation creator can delete it' }, { status: 403 });
    }

    await prisma.conversation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error({ error, userId, conversationId: id }, 'Failed to delete conversation');
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
});
