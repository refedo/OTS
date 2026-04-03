/**
 * Push Notification Service
 * Handles Web Push notifications via the web-push library
 */

import webpush from 'web-push';
import { NotificationType } from '@prisma/client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@hexasteel.sa';

  if (!publicKey || !privateKey) {
    logger.warn({}, 'VAPID keys not configured — push notifications disabled');
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  notificationId?: string;
  type?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

function getNotificationActions(type: NotificationType, relatedEntityType?: string | null): Array<{ action: string; title: string }> {
  if (!relatedEntityType) return [];

  if (relatedEntityType === 'task') {
    switch (type) {
      case 'TASK_ASSIGNED':
        return [{ action: 'complete', title: '✓ Complete' }];
      case 'APPROVAL_REQUIRED':
        return [
          { action: 'approve', title: '✓ Approve' },
          { action: 'reject', title: '✗ Reject' },
        ];
      default:
        return [];
    }
  }

  if (type === 'APPROVAL_REQUIRED') {
    return [
      { action: 'approve', title: '✓ Approve' },
      { action: 'reject', title: '✗ Reject' },
    ];
  }

  return [];
}

function getNotificationUrl(type: NotificationType, relatedEntityType?: string | null, relatedEntityId?: string | null): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  if (!relatedEntityType || !relatedEntityId) return `${basePath}/notifications`;

  // Conversation messages open the conversation thread directly
  if (type === 'TASK_MESSAGE') {
    return `${basePath}/conversations?taskId=${relatedEntityId}`;
  }

  const entityRoutes: Record<string, string> = {
    task: '/tasks',
    project: '/projects',
    building: '/projects',
    rfi: '/rfi',
    ncr: '/ncr',
    document: '/documents',
  };

  const route = entityRoutes[relatedEntityType];
  if (route) return `${basePath}${route}/${relatedEntityId}`;
  return `${basePath}/notifications`;
}

export class PushService {
  static async saveSubscription(params: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }) {
    return prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: params.userId,
          endpoint: params.endpoint,
        },
      },
      update: {
        p256dh: params.p256dh,
        auth: params.auth,
        userAgent: params.userAgent,
      },
      create: {
        userId: params.userId,
        endpoint: params.endpoint,
        p256dh: params.p256dh,
        auth: params.auth,
        userAgent: params.userAgent,
      },
    });
  }

  static async removeSubscription(userId: string, endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  static async removeAllSubscriptions(userId: string) {
    return prisma.pushSubscription.deleteMany({
      where: { userId },
    });
  }

  static async sendPushToUser(params: {
    userId: string;
    notificationId?: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
  }) {
    if (!ensureVapidConfigured()) return;

    // Check user preference for this notification type
    const preference = await prisma.userNotificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId: params.userId,
          notificationType: params.type,
        },
      },
    });

    if (preference && !preference.pushEnabled) {
      logger.info({ userId: params.userId, type: params.type }, 'Push skipped: disabled by user preference');
      return;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: params.userId },
    });

    if (subscriptions.length === 0) {
      logger.info({ userId: params.userId, type: params.type }, 'Push skipped: no push subscriptions found for user');
      return;
    }

    const url = getNotificationUrl(params.type, params.relatedEntityType, params.relatedEntityId);

    const actions = getNotificationActions(params.type, params.relatedEntityType);

    const payload: PushPayload = {
      title: params.title,
      body: params.message,
      icon: '/icons/icon-192x192.png',
      tag: params.notificationId || `ots-${params.type}-${Date.now()}`,
      url,
      notificationId: params.notificationId,
      type: params.type,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      requireInteraction: ['APPROVAL_REQUIRED', 'DEADLINE_WARNING', 'REJECTED'].includes(params.type),
      actions,
    };

    const staleEndpoints: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
            { TTL: 86400 }
          );
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          } else {
            logger.error({ error, userId: params.userId, endpoint: sub.endpoint }, 'Failed to send push notification');
          }
        }
      })
    );

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await prisma.pushSubscription.deleteMany({
        where: {
          userId: params.userId,
          endpoint: { in: staleEndpoints },
        },
      });
      logger.info({ userId: params.userId, count: staleEndpoints.length }, 'Removed stale push subscriptions');
    }
  }

  static async getSubscriptionCount(userId: string): Promise<number> {
    return prisma.pushSubscription.count({ where: { userId } });
  }
}

export default PushService;
