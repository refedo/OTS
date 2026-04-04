import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const createSchema = z.object({
  taskId: z.string().uuid().nullable().optional(),
  topic: z.string().min(1).max(200).nullable().optional(),
  firstMessage: z.string().min(1),
  inviteeIds: z.array(z.string().uuid()).optional().default([]),
});

/**
 * POST /api/conversations
 * Start a new conversation: either linked to an existing task, or create a
 * standalone "Discussion" task for topic-only threads.
 */
export const POST = withApiContext(async (req, session) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { taskId, topic, firstMessage, inviteeIds } = parsed.data;

  if (!taskId && !topic?.trim()) {
    return NextResponse.json({ error: 'Either taskId or topic is required' }, { status: 400 });
  }

  const userId = session!.userId;

  try {
    let targetTaskId = taskId ?? null;

    // If no task selected, create a standalone Discussion task
    if (!targetTaskId && topic) {
      const discussionTask = await prisma.task.create({
        data: {
          title: topic.trim(),
          createdById: userId,
          mainActivity: 'Discussion',
          status: 'In Progress',
        },
        select: { id: true },
      });
      targetTaskId = discussionTask.id;
    }

    if (!targetTaskId) {
      return NextResponse.json({ error: 'Could not resolve target task' }, { status: 500 });
    }

    // Add creator as participant
    await prisma.taskConversationParticipant.upsert({
      where: { taskId_userId: { taskId: targetTaskId, userId } },
      create: { taskId: targetTaskId, userId, invitedById: userId },
      update: {},
    });

    // Add invitees as participants
    if (inviteeIds.length > 0) {
      await Promise.all(inviteeIds.map(inviteeId =>
        prisma.taskConversationParticipant.upsert({
          where: { taskId_userId: { taskId: targetTaskId!, userId: inviteeId } },
          create: { taskId: targetTaskId!, userId: inviteeId, invitedById: userId },
          update: {},
        })
      ));
    }

    // Post first message
    const message = await prisma.taskMessage.create({
      data: { taskId: targetTaskId, userId, content: firstMessage },
      include: { user: { select: { id: true, name: true, position: true } } },
    });

    logger.info({ taskId: targetTaskId, userId, inviteeCount: inviteeIds.length }, 'Conversation started');
    return NextResponse.json({ taskId: targetTaskId, message });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to create conversation');
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
});

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
