import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { logger } from '@/lib/logger';
import NotificationService from '@/lib/services/notification.service';

const actionSchema = z.object({
  action: z.enum(['complete', 'approve', 'reject']),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: notificationId } = await params;

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId, userId: session.sub },
  });

  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  if (!notification.relatedEntityType || !notification.relatedEntityId) {
    return NextResponse.json({ error: 'No related entity for this notification' }, { status: 400 });
  }

  const { action } = parsed.data;
  const entityType = notification.relatedEntityType;
  const entityId = notification.relatedEntityId;

  try {
    if (entityType === 'task') {
      const updateData: Record<string, unknown> = {};

      if (action === 'complete') {
        updateData.status = 'Completed';
        updateData.completedAt = new Date();
        updateData.completedById = session.sub;
      } else if (action === 'approve') {
        updateData.approvedAt = new Date();
        updateData.approvedById = session.sub;
        updateData.rejectedAt = null;
        updateData.rejectedById = null;
        updateData.rejectionReason = null;
      } else if (action === 'reject') {
        updateData.rejectedAt = new Date();
        updateData.rejectedById = session.sub;
        updateData.approvedAt = null;
        updateData.approvedById = null;
      }

      const updatedTask = await prisma.task.update({
        where: { id: entityId },
        data: updateData,
        select: { id: true, title: true, assignedToId: true },
      });

      // Notify the assignee of the requester's decision
      if ((action === 'approve' || action === 'reject') && updatedTask.assignedToId && updatedTask.assignedToId !== session.sub) {
        try {
          if (action === 'approve') {
            await NotificationService.notifyApproved({
              userId: updatedTask.assignedToId,
              entityType: 'task',
              entityId: updatedTask.id,
              entityName: updatedTask.title,
              approverName: session.name,
            });
          } else {
            await NotificationService.notifyRejected({
              userId: updatedTask.assignedToId,
              entityType: 'task',
              entityId: updatedTask.id,
              entityName: updatedTask.title,
              rejectorName: session.name,
            });
          }
        } catch (notifError) {
          logger.error({ error: notifError, taskId: entityId, action }, 'Failed to notify assignee of task decision');
        }
      }
    } else {
      return NextResponse.json({ error: 'Unsupported entity type for this action' }, { status: 400 });
    }

    // Mark the notification as read after acting on it
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    logger.info(
      { notificationId, entityType, entityId, action, userId: session.sub },
      'Notification action executed from push notification'
    );

    return NextResponse.json({ success: true, action, entityType, entityId });
  } catch (error) {
    logger.error({ error, notificationId, action }, 'Failed to execute notification action');
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
