import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

const inviteSchema = z.object({
  userId: z.string().uuid(),
});

export const GET = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { id: taskId } = await params;
  try {
    const participants = await prisma.taskConversationParticipant.findMany({
      where: { taskId },
      select: {
        joinedAt: true,
        user: { select: { id: true, name: true, position: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(participants);
  } catch (error) {
    logger.error({ error, taskId }, 'Failed to fetch conversation participants');
    return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
  }
});

export const POST = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { id: taskId } = await params;
  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const task = await prisma.task.findFirst({ where: { id: taskId }, select: { id: true, title: true } });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const invitedUserId = parsed.data.userId;
    const inviterId = session!.userId;

    const participant = await prisma.taskConversationParticipant.upsert({
      where: { taskId_userId: { taskId, userId: invitedUserId } },
      update: {},
      create: { taskId, userId: invitedUserId, invitedById: inviterId },
      select: {
        joinedAt: true,
        user: { select: { id: true, name: true, position: true } },
        invitedBy: { select: { id: true, name: true } },
      },
    });

    const inviter = await prisma.user.findUnique({ where: { id: inviterId }, select: { name: true } });
    await NotificationService.createNotification({
      userId: invitedUserId,
      type: 'TASK_MESSAGE',
      title: `You were invited to a conversation`,
      message: `${inviter?.name ?? 'Someone'} invited you to join the conversation on task: ${task.title}`,
      relatedEntityType: 'task',
      relatedEntityId: taskId,
      metadata: { taskId, taskTitle: task.title, inviterId, inviterName: inviter?.name },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    logger.error({ error, taskId }, 'Failed to invite conversation participant');
    return NextResponse.json({ error: 'Failed to invite participant' }, { status: 500 });
  }
});

export const DELETE = withApiContext(async (req: NextRequest, session, { params }: { params: Promise<{ id: string }> }) => {
  const { id: taskId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId query param required' }, { status: 400 });

  try {
    await prisma.taskConversationParticipant.delete({
      where: { taskId_userId: { taskId, userId } },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, taskId, userId }, 'Failed to remove conversation participant');
    return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
  }
});
