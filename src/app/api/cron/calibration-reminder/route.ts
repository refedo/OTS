import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';
import { systemEventService } from '@/services/system-events.service';

/**
 * Cron job: ISO 9001 §7.1.5 — scan assets where calibration is due within 30 days
 * and create DEADLINE_WARNING notifications for hr.assets.manage holders.
 *
 * Trigger: POST /api/cron/calibration-reminder
 * Authorization: Bearer <CRON_SECRET>
 * Schedule: Daily at 08:00 Asia/Riyadh
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Find calibration-required assets due within 30 days
    const dueAssets = await prisma.asset.findMany({
      where: {
        deletedAt: null,
        calibrationRequired: true,
        calibrationDueAt: { lte: thirtyDaysFromNow },
        calibrationStatus: { not: 'NOT_REQUIRED' },
      },
      select: {
        id: true,
        assetCode: true,
        name: true,
        calibrationDueAt: true,
        calibrationStatus: true,
        calibrationFrequency: true,
      },
    });

    if (dueAssets.length === 0) {
      return NextResponse.json({ sent: 0, assets: 0 });
    }

    // Find users with hr.assets.manage permission
    const managersWithPermission = await prisma.user.findMany({
      where: {
        deletedAt: null,
        permissions: { contains: 'hr.assets.manage' },
      },
      select: { id: true, name: true },
    });

    let sent = 0;
    let failed = 0;

    for (const asset of dueAssets) {
      const daysUntilDue = asset.calibrationDueAt
        ? Math.ceil((asset.calibrationDueAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      const isOverdue = daysUntilDue < 0;
      const title = isOverdue
        ? `Calibration OVERDUE: ${asset.assetCode}`
        : `Calibration due in ${daysUntilDue} day(s): ${asset.assetCode}`;

      const message = `Asset "${asset.name}" (${asset.assetCode}) ${isOverdue
        ? `calibration was due ${Math.abs(daysUntilDue)} day(s) ago`
        : `calibration is due on ${asset.calibrationDueAt?.toLocaleDateString('en-SA-u-ca-gregory')}`}. Frequency: ${asset.calibrationFrequency ?? 'N/A'}.`;

      for (const manager of managersWithPermission) {
        try {
          await NotificationService.createNotification({
            userId: manager.id,
            type: 'DEADLINE_WARNING',
            title,
            message,
            relatedEntityType: 'Asset',
            relatedEntityId: asset.id,
            deadlineAt: asset.calibrationDueAt ?? undefined,
            metadata: {
              assetCode: asset.assetCode,
              calibrationStatus: asset.calibrationStatus,
              daysUntilDue,
            },
          });
          sent++;
        } catch (notifError) {
          logger.error({ notifError, assetId: asset.id, userId: manager.id }, 'Failed to create calibration notification');
          failed++;
        }
      }
    }

    systemEventService.log({
      eventType: 'IMS_CALIBRATION_REMINDERS_SENT',
      eventCategory: 'IMS',
      summary: `Calibration reminders: ${dueAssets.length} assets due, ${sent} notifications sent`,
      details: { dueAssets: dueAssets.length, sent, failed },
    });

    return NextResponse.json({ sent, failed, assets: dueAssets.length });
  } catch (error) {
    logger.error({ error }, 'Calibration reminder cron failed');
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}
