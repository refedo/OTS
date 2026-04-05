import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const PATCH = withApiContext(async (_req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const userId = session!.userId;
  const { id: taskId } = await params;

  try {
    await prisma.taskConversationParticipant.upsert({
      where: { taskId_userId: { taskId, userId } },
      update: { lastReadAt: new Date() },
      create: { taskId, userId, lastReadAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error, userId, taskId }, 'Failed to mark task conversation as read');
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
});
