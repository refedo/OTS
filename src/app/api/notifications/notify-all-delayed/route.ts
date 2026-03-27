import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

export const POST = withApiContext(async (_req, session) => {
  try {
    const now = new Date();

    // Fetch all delayed (overdue) tasks that are not completed, have an assignee, and are past due
    const delayedTasks = await prisma.task.findMany({
      where: {
        status: { notIn: ['Completed'] },
        dueDate: { lt: now },
        assignedToId: { not: null },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assignedToId: true,
        project: { select: { projectNumber: true } },
      },
    });

    if (delayedTasks.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    let notified = 0;
    await Promise.allSettled(
      delayedTasks.map(async (task) => {
        if (!task.assignedToId) return;
        const projectLabel = task.project ? ` (${task.project.projectNumber})` : '';
        try {
          await NotificationService.createNotification({
            userId: task.assignedToId,
            type: 'DEADLINE_WARNING',
            title: 'Task Overdue — Action Required',
            message: `Your task "${task.title}"${projectLabel} is overdue. Please update the status immediately.`,
            relatedEntityType: 'task',
            relatedEntityId: task.id,
            deadlineAt: task.dueDate ?? undefined,
            metadata: { taskTitle: task.title, projectLabel, isOverdue: true, sentBy: session!.userId },
          });
          notified++;
        } catch (err) {
          logger.warn({ err, taskId: task.id }, 'Failed to notify assignee for delayed task');
        }
      }),
    );

    logger.info({ notified, total: delayedTasks.length, sentBy: session!.userId }, 'Bulk delayed task notifications sent');
    return NextResponse.json({ success: true, notified });
  } catch (error) {
    logger.error({ error }, 'Failed to send bulk delayed task notifications');
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
  }
});
