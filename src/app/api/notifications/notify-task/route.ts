import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

const notifySchema = z.object({
  taskId: z.string().min(1),
});

export const POST = withApiContext(async (req, session) => {
  const body = await req.json();
  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { taskId } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      dueDate: true,
      status: true,
      assignedToId: true,
      assignedTo: { select: { id: true, name: true } },
      project: { select: { projectNumber: true, name: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (!task.assignedToId || !task.assignedTo) {
    return NextResponse.json({ error: 'Task has no assignee' }, { status: 400 });
  }

  if (task.status === 'Completed') {
    return NextResponse.json({ error: 'Task is already completed' }, { status: 400 });
  }

  try {
    const dueDate = task.dueDate ? new Date(task.dueDate) : new Date();
    const now = new Date();
    const hoursRemaining = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    const isOverdue = hoursRemaining < 0;

    const projectLabel = task.project ? ` (${task.project.projectNumber})` : '';

    await NotificationService.createNotification({
      userId: task.assignedToId,
      type: 'DEADLINE_WARNING',
      title: isOverdue ? 'Task Overdue — Action Required' : 'Task Due Soon — Please Update',
      message: isOverdue
        ? `Your task "${task.title}"${projectLabel} is overdue. Please update the status immediately.`
        : `Your task "${task.title}"${projectLabel} is due soon. Please update the status.`,
      relatedEntityType: 'task',
      relatedEntityId: task.id,
      deadlineAt: task.dueDate ?? undefined,
      metadata: {
        taskTitle: task.title,
        projectLabel,
        isOverdue,
        sentBy: session!.userId,
      },
    });

    logger.info({ taskId, assignedToId: task.assignedToId, sentBy: session!.userId }, 'Task push notification sent');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, taskId }, 'Failed to send task push notification');
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
});
