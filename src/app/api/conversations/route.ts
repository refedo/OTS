import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (req, session) => {
  const userId = session!.userId;
  try {
    // Find all tasks where the user is a participant or has sent a message
    const [participantTasks, messageTasks] = await Promise.all([
      prisma.taskConversationParticipant.findMany({
        where: { userId },
        select: { taskId: true },
      }),
      prisma.taskMessage.findMany({
        where: { userId },
        select: { taskId: true },
        distinct: ['taskId'],
      }),
    ]);

    const taskIds = [...new Set([
      ...participantTasks.map(p => p.taskId),
      ...messageTasks.map(m => m.taskId),
    ])];

    if (taskIds.length === 0) return NextResponse.json([]);

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: {
        id: true,
        title: true,
        status: true,
        project: { select: { id: true, projectNumber: true, name: true } },
        building: { select: { id: true, name: true, designation: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
        conversationParticipants: {
          select: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = tasks.map(t => ({
      taskId: t.id,
      taskTitle: t.title,
      taskStatus: t.status,
      project: t.project,
      building: t.building,
      lastMessage: t.messages[0] ?? null,
      participants: t.conversationParticipants.map(p => p.user),
    }));

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, userId }, 'Failed to fetch conversations');
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
});
