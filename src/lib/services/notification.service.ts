/**
 * Notification Service
 * Handles creation, retrieval, and management of notifications
 * Part of the Hexa Steel OTS Notification Center Module
 */

import { PrismaClient, NotificationType, Notification } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  deadlineAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  userId: string;
  isRead?: boolean;
  isArchived?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(params: CreateNotificationParams): Promise<Notification> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          relatedEntityType: params.relatedEntityType,
          relatedEntityId: params.relatedEntityId,
          deadlineAt: params.deadlineAt,
          metadata: params.metadata || {},
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  /**
   * Get notifications for a user with filters
   */
  static async getNotifications(filters: NotificationFilters): Promise<Notification[]> {
    try {
      const where: any = {
        userId: filters.userId,
      };

      if (filters.isRead !== undefined) {
        where.isRead = filters.isRead;
      }

      if (filters.isArchived !== undefined) {
        where.isArchived = filters.isArchived;
      }

      if (filters.type) {
        where.type = filters.type;
      }

      const notifications = await prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
          isArchived: false,
        },
      });

      return count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw new Error('Failed to fetch unread count');
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId, // Ensure user owns this notification
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<{ count: number }> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return { count: result.count };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Archive a notification
   */
  static async archiveNotification(notificationId: string, userId: string): Promise<Notification> {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId,
        },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      });

      return notification;
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw new Error('Failed to archive notification');
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notification.delete({
        where: {
          id: notificationId,
          userId,
        },
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  // ============================================
  // NOTIFICATION TRIGGERS
  // ============================================

  /**
   * Trigger: Task Assigned
   */
  static async notifyTaskAssigned(params: {
    taskId: string;
    assignedToId: string;
    taskTitle: string;
    assignedByName: string;
    dueDate?: Date;
    projectName?: string;
    buildingName?: string;
  }): Promise<Notification> {
    return this.createNotification({
      userId: params.assignedToId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `${params.assignedByName} assigned you a task: "${params.taskTitle}"${
        params.projectName ? ` in project ${params.projectName}` : ''
      }${params.buildingName ? ` - ${params.buildingName}` : ''}`,
      relatedEntityType: 'task',
      relatedEntityId: params.taskId,
      deadlineAt: params.dueDate,
      metadata: {
        taskTitle: params.taskTitle,
        assignedBy: params.assignedByName,
        projectName: params.projectName,
        buildingName: params.buildingName,
      },
    });
  }

  /**
   * Trigger: Approval Required
   */
  static async notifyApprovalRequired(params: {
    userId: string;
    entityType: string;
    entityId: string;
    entityName: string;
    requesterName: string;
    deadline?: Date;
  }): Promise<Notification> {
    return this.createNotification({
      userId: params.userId,
      type: 'APPROVAL_REQUIRED',
      title: 'Approval Required',
      message: `${params.requesterName} submitted ${params.entityType} "${params.entityName}" for your approval`,
      relatedEntityType: params.entityType,
      relatedEntityId: params.entityId,
      deadlineAt: params.deadline,
      metadata: {
        entityName: params.entityName,
        requesterName: params.requesterName,
      },
    });
  }

  /**
   * Trigger: Deadline Warning
   */
  static async notifyDeadlineWarning(params: {
    userId: string;
    entityType: string;
    entityId: string;
    entityName: string;
    deadline: Date;
    hoursRemaining: number;
  }): Promise<Notification> {
    const timeText =
      params.hoursRemaining < 24
        ? `${params.hoursRemaining} hours`
        : `${Math.floor(params.hoursRemaining / 24)} days`;

    return this.createNotification({
      userId: params.userId,
      type: 'DEADLINE_WARNING',
      title: 'Deadline Approaching',
      message: `${params.entityType} "${params.entityName}" is due in ${timeText}`,
      relatedEntityType: params.entityType,
      relatedEntityId: params.entityId,
      deadlineAt: params.deadline,
      metadata: {
        entityName: params.entityName,
        hoursRemaining: params.hoursRemaining,
      },
    });
  }

  /**
   * Trigger: Item Approved
   */
  static async notifyApproved(params: {
    userId: string;
    entityType: string;
    entityId: string;
    entityName: string;
    approverName: string;
  }): Promise<Notification> {
    return this.createNotification({
      userId: params.userId,
      type: 'APPROVED',
      title: 'Approved',
      message: `${params.approverName} approved your ${params.entityType} "${params.entityName}"`,
      relatedEntityType: params.entityType,
      relatedEntityId: params.entityId,
      metadata: {
        entityName: params.entityName,
        approverName: params.approverName,
      },
    });
  }

  /**
   * Trigger: Item Rejected
   */
  static async notifyRejected(params: {
    userId: string;
    entityType: string;
    entityId: string;
    entityName: string;
    rejectorName: string;
    reason?: string;
  }): Promise<Notification> {
    return this.createNotification({
      userId: params.userId,
      type: 'REJECTED',
      title: 'Rejected',
      message: `${params.rejectorName} rejected your ${params.entityType} "${params.entityName}"${
        params.reason ? `: ${params.reason}` : ''
      }`,
      relatedEntityType: params.entityType,
      relatedEntityId: params.entityId,
      metadata: {
        entityName: params.entityName,
        rejectorName: params.rejectorName,
        reason: params.reason,
      },
    });
  }

  /**
   * Trigger: System Notification
   */
  static async notifySystem(params: {
    userId: string;
    title: string;
    message: string;
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    return this.createNotification({
      userId: params.userId,
      type: 'SYSTEM',
      title: params.title,
      message: params.message,
      metadata: params.metadata,
    });
  }

  /**
   * Get notifications grouped by deadline urgency
   */
  static async getDeadlineNotifications(userId: string): Promise<{
    urgent: Notification[]; // < 24 hours
    soon: Notification[]; // 24-48 hours
    upcoming: Notification[]; // > 48 hours
  }> {
    try {
      const now = new Date();
      const urgent24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const soon48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          isArchived: false,
          deadlineAt: {
            not: null,
            gte: now,
          },
        },
        orderBy: {
          deadlineAt: 'asc',
        },
      });

      return {
        urgent: notifications.filter((n) => n.deadlineAt && n.deadlineAt <= urgent24h),
        soon: notifications.filter(
          (n) => n.deadlineAt && n.deadlineAt > urgent24h && n.deadlineAt <= soon48h
        ),
        upcoming: notifications.filter((n) => n.deadlineAt && n.deadlineAt > soon48h),
      };
    } catch (error) {
      console.error('Error fetching deadline notifications:', error);
      throw new Error('Failed to fetch deadline notifications');
    }
  }
}

export default NotificationService;
