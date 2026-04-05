import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

export const GET = withApiContext(async (req, session) => {
  const userId = session!.userId;
  try {
    // Task-linked conversations: user is a participant or sent a message
    const [participantTasks, messageTasks, standaloneConvs] = await Promise.all([
      prisma.taskConversationParticipant.findMany({
        where: { userId },
        select: { taskId: true },
      }),
      prisma.taskMessage.findMany({
        where: { userId },
        select: { taskId: true },
        distinct: ['taskId'],
      }),
      // Standalone conversations: user is a participant
      prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true },
      }),
    ]);

    const taskIds = [...new Set([
      ...participantTasks.map(p => p.taskId),
      ...messageTasks.map(m => m.taskId),
    ])];

    const [tasks, conversations] = await Promise.all([
      taskIds.length > 0
        ? prisma.task.findMany({
            where: { id: { in: taskIds }, NOT: { mainActivity: 'Discussion' } },
            select: {
              id: true,
              title: true,
              status: true,
              project: { select: { id: true, projectNumber: true, name: true } },
              building: { select: { id: true, name: true, designation: true } },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { content: true, createdAt: true, user: { select: { id: true, name: true } } },
              },
              conversationParticipants: {
                select: { user: { select: { id: true, name: true } } },
              },
            },
            orderBy: { updatedAt: 'desc' },
          })
        : Promise.resolve([]),
      standaloneConvs.length > 0
        ? prisma.conversation.findMany({
            where: { id: { in: standaloneConvs.map(c => c.conversationId) } },
            select: {
              id: true,
              topic: true,
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { content: true, createdAt: true, user: { select: { id: true, name: true } } },
              },
              participants: {
                select: { user: { select: { id: true, name: true } } },
              },
            },
            orderBy: { updatedAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const taskResults = tasks.map(t => ({
      type: 'task' as const,
      taskId: t.id,
      taskTitle: t.title,
      taskStatus: t.status,
      project: t.project,
      building: t.building,
      lastMessage: t.messages[0] ?? null,
      participants: t.conversationParticipants.map(p => p.user),
      updatedAt: t.messages[0]?.createdAt ?? null,
    }));

    const convResults = conversations.map(c => ({
      type: 'standalone' as const,
      conversationId: c.id,
      topic: c.topic,
      lastMessage: c.messages[0] ?? null,
      participants: c.participants.map(p => p.user),
      updatedAt: c.messages[0]?.createdAt ?? null,
    }));

    // Merge and sort by last message time (most recent first)
    const all = [...taskResults, ...convResults].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json(all);
  } catch (error) {
    logger.error({ error, userId }, 'Failed to fetch conversations');
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
});

const postSchema = z.object({
  taskId: z.string().optional().nullable(),
  topic: z.string().min(1).max(500).optional().nullable(),
  firstMessage: z.string().min(1).max(5000),
  inviteeIds: z.array(z.string()).optional(),
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  const userId = session!.userId;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { taskId, topic, firstMessage, inviteeIds = [] } = parsed.data;

  try {
    // Task-linked conversation: just post first message and add participants
    if (taskId) {
      const task = await prisma.task.findFirst({ where: { id: taskId }, select: { id: true, title: true, assignedToId: true, createdById: true } });
      if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

      await prisma.$transaction([
        prisma.taskMessage.create({
          data: { taskId, userId, content: firstMessage },
        }),
        prisma.taskConversationParticipant.upsert({
          where: { taskId_userId: { taskId, userId } },
          update: {},
          create: { taskId, userId },
        }),
        ...inviteeIds.map(uid =>
          prisma.taskConversationParticipant.upsert({
            where: { taskId_userId: { taskId, userId: uid } },
            update: {},
            create: { taskId, userId: uid, invitedById: userId },
          })
        ),
      ]);

      return NextResponse.json({ type: 'task', taskId });
    }

    // Standalone conversation: create Conversation record
    if (!topic) {
      return NextResponse.json({ error: 'Either taskId or topic is required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.create({
      data: {
        topic: topic.trim(),
        createdById: userId,
        messages: {
          create: { userId, content: firstMessage },
        },
        participants: {
          create: [
            { userId },
            ...inviteeIds.map(uid => ({ userId: uid, invitedById: userId })),
          ],
        },
      },
      select: { id: true },
    });

    // Notify invitees
    if (inviteeIds.length > 0) {
      const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const senderName = sender?.name ?? 'Someone';
      Promise.resolve().then(async () => {
        try {
          await Promise.all(
            inviteeIds.map(recipientId =>
              NotificationService.createNotification({
                userId: recipientId,
                type: 'TASK_MESSAGE',
                title: `New conversation: ${topic.trim()}`,
                message: `${senderName} started a conversation and added you`,
                relatedEntityType: 'conversation',
                relatedEntityId: conversation.id,
                metadata: { conversationId: conversation.id, topic: topic.trim(), senderId: userId, senderName },
              })
            )
          );
        } catch (err) {
          logger.error({ err }, 'Failed to send conversation invitee notifications');
        }
      });
    }

    return NextResponse.json({ type: 'standalone', conversationId: conversation.id }, { status: 201 });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to create conversation');
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
});
