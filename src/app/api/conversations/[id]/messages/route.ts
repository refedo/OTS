import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

export const GET = withApiContext(async (
  _req: NextRequest,
  session,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: conversationId } = await params;
  const userId = session!.userId;

  const conv = await prisma.conversation.findFirst({ where: { id: conversationId }, select: { id: true, topic: true } });
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

  const [messages, participants] = await Promise.all([
    prisma.conversationMessage.findMany({
      where: { conversationId },
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
    prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: {
        joinedAt: true,
        user: { select: { id: true, name: true, position: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({ messages, participants });
});

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

export const POST = withApiContext(async (
  req: NextRequest,
  session,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: conversationId } = await params;
  const userId = session!.userId;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId },
      select: { id: true, topic: true },
    });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const message = await prisma.conversationMessage.create({
      data: {
        conversationId,
        userId,
        content: parsed.data.content,
        ...(parsed.data.attachments?.length ? { attachments: parsed.data.attachments } : {}),
      },
      select: {
        id: true,
        content: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, position: true } },
      },
    });

    // Ensure sender is a participant
    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: {},
      create: { conversationId, userId },
    });

    // Touch conversation updatedAt
    await prisma.conversation.update({ where: { id: conversationId }, data: {} });

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const recipientIds = participants.map(p => p.userId).filter(id => id !== userId);

    if (recipientIds.length > 0) {
      const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const senderName = sender?.name ?? 'Someone';
      const content = parsed.data.content;
      Promise.resolve().then(async () => {
        try {
          await Promise.all(
            recipientIds.map(recipientId =>
              NotificationService.createNotification({
                userId: recipientId,
                type: 'TASK_MESSAGE',
                title: `New message in: ${conv.topic}`,
                message: `${senderName}: ${content.slice(0, 100)}${content.length > 100 ? '…' : ''}`,
                relatedEntityType: 'conversation',
                relatedEntityId: conversationId,
                metadata: { conversationId, topic: conv.topic, senderId: userId, senderName },
              })
            )
          );
        } catch (err) {
          logger.error({ err, conversationId }, 'Failed to send conversation message notifications');
        }
      });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to post conversation message');
    return NextResponse.json({ error: 'Failed to post message' }, { status: 500 });
  }
});
