import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import NotificationService from '@/lib/services/notification.service';
import { logger } from '@/lib/logger';

const requestSchema = z.object({
  type: z.enum(['clarification', 'time_extension']),
  message: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { type, message } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      createdById: true,
      requesterId: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const typeLabel = type === 'clarification' ? 'Clarification Request' : 'Time Extension Request';
  const notificationTitle = `${typeLabel} for Task`;
  const notificationMessage =
    type === 'clarification'
      ? `${session.name} is asking for clarification on "${task.title}": ${message}`
      : `${session.name} is requesting a time extension for "${task.title}": ${message}`;

  try {
    const notifyIds = new Set<string>();
    notifyIds.add(task.createdById);
    if (task.requesterId) notifyIds.add(task.requesterId);

    for (const recipientId of notifyIds) {
      if (recipientId !== session.sub) {
        await NotificationService.createNotification({
          userId: recipientId,
          type: 'TASK_ASSIGNED',
          title: notificationTitle,
          message: notificationMessage,
          relatedEntityType: 'task',
          relatedEntityId: task.id,
          metadata: { taskTitle: task.title, requestType: type, requestedBy: session.name, message },
        });
      }
    }

    logger.info({ taskId: id, type, userId: session.sub }, 'Task request notification sent');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, taskId: id, type }, 'Failed to send task request notification');
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
}
