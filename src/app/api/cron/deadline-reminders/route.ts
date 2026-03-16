import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

/**
 * Cron job: send push notifications to task assignees whose task is due in ~2 days.
 *
 * Trigger with: POST /api/cron/deadline-reminders
 * Authorization: Bearer <CRON_SECRET>
 *
 * Recommended schedule: once daily (e.g. 08:00)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  // Read lazily so env validation does not run at module-load time during build
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  // Window: tasks due between 40 h and 48 h from now so we catch the ~2-day mark
  // regardless of what time of day the cron runs.
  const windowStart = new Date(now.getTime() + 40 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: { gte: windowStart, lte: windowEnd },
      status: { notIn: ['Completed'] },
      assignedToId: { not: null },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assignedToId: true,
      project: { select: { projectNumber: true } },
    },
  });

  if (tasks.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    tasks.map(async (task) => {
      try {
        const projectLabel = task.project ? ` (${task.project.projectNumber})` : '';
        await NotificationService.createNotification({
          userId: task.assignedToId!,
          type: 'DEADLINE_WARNING',
          title: 'Task Due in 2 Days',
          message: `Your task "${task.title}"${projectLabel} is due in 2 days. Please make sure it is completed on time.`,
          relatedEntityType: 'task',
          relatedEntityId: task.id,
          deadlineAt: task.dueDate ?? undefined,
          metadata: { taskTitle: task.title, projectLabel, source: 'cron' },
        });
        sent++;
      } catch (error) {
        failed++;
        logger.error({ error, taskId: task.id }, 'Failed to send deadline reminder');
      }
    })
  );

  logger.info({ sent, failed, windowStart, windowEnd }, 'Deadline reminders cron completed');
  return NextResponse.json({ sent, failed });
}
