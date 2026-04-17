import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

export const GET = withApiContext(async (req, session) => {
  const userId = session!.userId;
  const url = new URL(req.url);
  const showArchived = url.searchParams.get('archived') === 'true';

  try {
    const [participantTasks, messageTasks] = await Promise.all([
      prisma.taskConversationParticipant.findMany({
        where: { userId },
        select: { taskId: true, lastReadAt: true, archivedAt: true },
      }),
      prisma.taskMessage.findMany({
        where: { userId },
        select: { taskId: true },
        distinct: ['taskId'],
      }),
    ]);

    let standaloneConvs: { conversationId: string; lastReadAt: Date | null; archivedAt: Date | null }[] = [];
    try {
      standaloneConvs = await prisma.conversationParticipant.findMany({
        where: { userId },
        select: { conversationId: true, lastReadAt: true, archivedAt: true },
      });
    } catch {
      // Table doesn't exist yet
    }

    const taskLastReadMap = new Map(participantTasks.map(p => [p.taskId, p.lastReadAt]));
    const taskArchivedMap = new Map(participantTasks.map(p => [p.taskId, p.archivedAt]));
    const convLastReadMap = new Map(standaloneConvs.map(c => [c.conversationId, c.lastReadAt]));
    const convArchivedMap = new Map(standaloneConvs.map(c => [c.conversationId, c.archivedAt]));

    // Filter archived based on query param
    const activeParticipantTasks = showArchived
      ? participantTasks
      : participantTasks.filter(p => !p.archivedAt);
    const activeMessageTaskIds = messageTasks.map(m => m.taskId);
    // For message-only tasks (no participant entry), include them if not in archived map
    const participantTaskIds = new Set(activeParticipantTasks.map(p => p.taskId));
    const messageOnlyTaskIds = activeMessageTaskIds.filter(id =>
      !participantTaskIds.has(id) && (showArchived || !taskArchivedMap.get(id))
    );

    const taskIds = [...new Set([
      ...activeParticipantTasks.map(p => p.taskId),
      ...messageOnlyTaskIds,
    ])];

    const activeStandaloneConvs = showArchived
      ? standaloneConvs
      : standaloneConvs.filter(c => !c.archivedAt);

    let conversations: Array<{
      id: string; topic: string;
      messages: Array<{ content: string; createdAt: Date; user: { id: string; name: string } }>;
      participants: Array<{ user: { id: string; name: string } }>;
    }> = [];

    const [tasks] = await Promise.all([
      taskIds.length > 0
        ? prisma.task.findMany({
            where: { id: { in: taskIds } },
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
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
    ]);

    if (activeStandaloneConvs.length > 0) {
      try {
        conversations = await prisma.conversation.findMany({
          where: {
            id: { in: activeStandaloneConvs.map(c => c.conversationId) },
            deletedAt: null,
          },
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
        });
      } catch {
        // Table doesn't exist yet
      }
    }

    const taskResults = tasks.map(t => {
      const lastMsg = t.messages[0] ?? null;
      const lastRead = taskLastReadMap.get(t.id) ?? null;
      const hasUnread = lastMsg !== null && (lastRead === null || new Date(lastMsg.createdAt) > new Date(lastRead));
      const isArchived = !!(taskArchivedMap.get(t.id));
      return {
        type: 'task' as const,
        taskId: t.id,
        taskTitle: t.title,
        taskStatus: t.status,
        taskDueDate: t.dueDate ? t.dueDate.toISOString() : null,
        project: t.project,
        building: t.building,
        lastMessage: lastMsg,
        participants: t.conversationParticipants.map(p => p.user),
        updatedAt: lastMsg?.createdAt ?? null,
        hasUnread,
        isArchived,
      };
    });

    const convResults = conversations.map(c => {
      const lastMsg = c.messages[0] ?? null;
      const lastRead = convLastReadMap.get(c.id) ?? null;
      const hasUnread = lastMsg !== null && (lastRead === null || new Date(lastMsg.createdAt) > new Date(lastRead));
      const isArchived = !!(convArchivedMap.get(c.id));
      return {
        type: 'standalone' as const,
        conversationId: c.id,
        topic: c.topic,
        lastMessage: lastMsg,
        participants: c.participants.map(p => p.user),
        updatedAt: lastMsg?.createdAt ?? null,
        hasUnread,
        isArchived,
      };
    });

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
