import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

const attachmentSchema = z.object({
  fileName: z.string(),
  filePath: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
});

const postSchema = z.object({
  content: z.string().max(5000).default(''),
  attachments: z.array(attachmentSchema).optional(),
}).refine(d => d.content.trim().length > 0 || (d.attachments && d.attachments.length > 0), {
  message: 'Message must have content or at least one attachment',
});

export const GET = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { id: taskId } = await params;
  try {
    const task = await prisma.task.findFirst({ where: { id: taskId }, select: { id: true, title: true } });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const [messages, participants] = await Promise.all([
      prisma.taskMessage.findMany({
        where: { taskId },
        select: {
          id: true,
          content: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, position: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.taskConversationParticipant.findMany({
        where: { taskId },
        select: {
          joinedAt: true,
          user: { select: { id: true, name: true, position: true } },
          invitedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({ messages, participants });
  } catch (error) {
    logger.error({ error, taskId }, 'Failed to fetch task messages');
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { id: taskId } = await params;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId },
      select: { id: true, title: true, assignedToId: true, createdById: true },
    });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const userId = session!.userId;

    const [message] = await prisma.$transaction([
      prisma.taskMessage.create({
        data: {
          taskId,
          userId,
          content: parsed.data.content,
          ...(parsed.data.attachments && parsed.data.attachments.length > 0
            ? { attachments: parsed.data.attachments }
            : {}),
        },
        select: {
          id: true,
          content: true,
          attachments: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, position: true } },
        },
      }),
      prisma.taskConversationParticipant.upsert({
        where: { taskId_userId: { taskId, userId } },
        update: {},
        create: { taskId, userId },
      }),
    ]);

    // Auto-add task assignee + creator as conversation participants so the conversation appears in their list
    const autoParticipantIds = [task.assignedToId, task.createdById].filter(
      (id): id is string => !!id && id !== userId
    );
    if (autoParticipantIds.length > 0) {
      await Promise.all(
        autoParticipantIds.map(uid =>
          prisma.taskConversationParticipant.upsert({
            where: { taskId_userId: { taskId, userId: uid } },
            update: {},
            create: { taskId, userId: uid },
          })
        )
      );
    }

    const participants = await prisma.taskConversationParticipant.findMany({
      where: { taskId },
      select: { userId: true },
    });

    // Notify: conversation participants + task assignee + task creator (deduplicated, excluding sender)
    const participantIds = participants.map(p => p.userId);
    const implicitIds = [task.assignedToId, task.createdById].filter(Boolean) as string[];
    const recipientSet = new Set([...participantIds, ...implicitIds]);
    recipientSet.delete(userId);
    const otherParticipantIds = [...recipientSet];

    const response = NextResponse.json(message, { status: 201 });

    // Fire-and-forget: notifications must not block the response
    if (otherParticipantIds.length > 0) {
      const content = parsed.data.content;
      const taskTitle = task.title;
      Promise.resolve().then(async () => {
        try {
          const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
          await Promise.all(
            otherParticipantIds.map(recipientId =>
              NotificationService.createNotification({
                userId: recipientId,
                type: 'TASK_MESSAGE',
                title: `New message on task: ${taskTitle}`,
                message: `${sender?.name ?? 'Someone'}: ${content.slice(0, 100)}${content.length > 100 ? '…' : ''}`,
                relatedEntityType: 'task',
                relatedEntityId: taskId,
                metadata: { taskId, taskTitle, senderId: userId, senderName: sender?.name },
              })
            )
          );
        } catch (err) {
          logger.error({ err, taskId }, 'Failed to send task message notifications');
        }
      });
    }

    return response;
  } catch (error) {
    logger.error({ error, taskId }, 'Failed to post task message');
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
  }
});
