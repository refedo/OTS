import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

export const GET = withApiContext(async (
  _req: NextRequest,
  _session,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: conversationId } = await params;
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: {
      joinedAt: true,
      user: { select: { id: true, name: true, position: true } },
      invitedBy: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(participants);
});

export const POST = withApiContext(async (
  req: NextRequest,
  session,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: conversationId } = await params;
  const userId = session!.userId;
  const body = await req.json();
  const parsed = z.object({ userId: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  try {
    const conv = await prisma.conversation.findFirst({ where: { id: conversationId }, select: { id: true, topic: true } });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId: parsed.data.userId } },
      update: {},
      create: { conversationId, userId: parsed.data.userId, invitedById: userId },
    });

    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: parsed.data.userId },
      select: {
        joinedAt: true,
        user: { select: { id: true, name: true, position: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    });

    const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    Promise.resolve().then(async () => {
      try {
        await NotificationService.createNotification({
          userId: parsed.data.userId,
          type: 'TASK_MESSAGE',
          title: `Added to conversation: ${conv.topic}`,
          message: `${inviter?.name ?? 'Someone'} added you to a conversation`,
          relatedEntityType: 'conversation',
          relatedEntityId: conversationId,
          metadata: { conversationId, topic: conv.topic, invitedById: userId },
        });
      } catch (err) {
        logger.error({ err }, 'Failed to send participant invite notification');
      }
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    logger.error({ error, conversationId }, 'Failed to add participant');
    return NextResponse.json({ error: 'Failed to add participant' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (
  req: NextRequest,
  _session,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: conversationId } = await params;
  const url = new URL(req.url!);
  const targetUserId = url.searchParams.get('userId');
  if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  try {
    await prisma.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ error, conversationId, targetUserId }, 'Failed to remove participant');
    return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
  }
});
