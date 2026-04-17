import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const PATCH = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const userId = session!.userId;
  const { id: taskId } = await params;
  const body = await req.json().catch(() => ({}));
  const archive = body.archive !== false;

  try {
    await prisma.taskConversationParticipant.upsert({
      where: { taskId_userId: { taskId, userId } },
      update: { archivedAt: archive ? new Date() : null },
      create: { taskId, userId, archivedAt: archive ? new Date() : null },
    });

    return NextResponse.json({ archived: archive });
  } catch (error) {
    logger.error({ error, userId, taskId }, 'Failed to archive task conversation');
    return NextResponse.json({ error: 'Failed to archive task conversation' }, { status: 500 });
  }
});
