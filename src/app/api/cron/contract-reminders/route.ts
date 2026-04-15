import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { NotificationService } from '@/lib/services/notification.service';

/**
 * Cron job: send notifications for contracts expiring within their notifyDaysBefore window.
 *
 * Trigger: POST /api/cron/contract-reminders
 * Authorization: Bearer <CRON_SECRET>
 *
 * Recommended schedule: daily at 08:00 Asia/Riyadh
 *
 * 18.14.0
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start of today (for dedup check)
  const startOfToday = new Date(today);

  // Find max window: contracts expiring within 365 days (widest possible notifyDaysBefore)
  const maxWindow = new Date(today.getTime() + 365 * 86400000);

  const contracts = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      expiryDate: { gte: today, lte: maxWindow },
    },
    select: {
      id: true,
      title: true,
      contractNumber: true,
      type: true,
      expiryDate: true,
      notifyDaysBefore: true,
    },
  });

  if (contracts.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
  }

  // Find all users with hr.contracts.manage permission
  const allUsers = await prisma.user.findMany({
    where: { status: 'active' },
    select: { id: true, role: { select: { permissions: true } }, customPermissions: true },
  });

  const managerIds = allUsers
    .filter((u) => {
      const perms = (u.customPermissions ?? u.role?.permissions ?? []) as string[];
      return Array.isArray(perms) && perms.includes('hr.contracts.manage');
    })
    .map((u) => u.id);

  if (managerIds.length === 0) {
    logger.warn({}, '[contract-reminders] No users with hr.contracts.manage found');
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  await Promise.allSettled(
    contracts.map(async (contract) => {
      if (!contract.expiryDate) return;

      const expiry = new Date(contract.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86400000);

      // Check if within this contract's notification window
      if (daysLeft > contract.notifyDaysBefore) {
        skipped++;
        return;
      }

      // Dedup: skip if any notification for this contract was already sent today
      const alreadySent = await prisma.notification.findFirst({
        where: {
          relatedEntityId: contract.id,
          type: 'DEADLINE_WARNING',
          createdAt: { gte: startOfToday },
        },
        select: { id: true },
      });

      if (alreadySent) {
        skipped++;
        return;
      }

      const expiryLabel = expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      await Promise.allSettled(
        managerIds.map(async (userId) => {
          try {
            await NotificationService.createNotification({
              userId,
              type: 'DEADLINE_WARNING',
              title: 'Contract Expiring Soon',
              message: `"${contract.title}" (${contract.contractNumber}) expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} on ${expiryLabel}.`,
              relatedEntityType: 'contract',
              relatedEntityId: contract.id,
            });
            sent++;
          } catch (err) {
            logger.error({ err, contractId: contract.id, userId }, '[contract-reminders] Failed to notify user');
            failed++;
          }
        })
      );
    })
  );

  logger.info({ sent, skipped, failed }, '[contract-reminders] Cron run complete');
  return NextResponse.json({ sent, skipped, failed });
}
