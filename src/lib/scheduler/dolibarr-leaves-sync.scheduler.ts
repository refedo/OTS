import * as cron from 'node-cron';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'DolibarrLeavesSyncScheduler' });

const SCHEDULER_CONFIG = {
  JOB_NAME: 'DolibarrLeavesSync',
  // Nightly at 03:00 Riyadh time — mid-night so it doesn't collide with
  // the morning attendance / employee syncs.
  CRON_EXPRESSION: '0 3 * * *',
  TIMEZONE: 'Asia/Riyadh',
};

declare global {
  // eslint-disable-next-line no-var
  var __dolibarrLeavesSyncSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __dolibarrLeavesSyncSchedulerTask: cron.ScheduledTask | undefined;
}

export class DolibarrLeavesSyncScheduler {
  private static isRunning = false;

  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_DOLIBARR_LEAVES_SYNC_SCHEDULER;
    if (envValue === undefined) {
      return process.env.NODE_ENV === 'production';
    }
    return envValue === 'true' || envValue === '1';
  }

  static initialize(): void {
    if (global.__dolibarrLeavesSyncSchedulerInitialized) {
      log.info({}, 'Scheduler already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.info(
        { enabled: process.env.ENABLE_DOLIBARR_LEAVES_SYNC_SCHEDULER },
        'Scheduler disabled',
      );
      return;
    }

    if (!cron.validate(SCHEDULER_CONFIG.CRON_EXPRESSION)) {
      log.error({ cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION }, 'Invalid cron expression');
      return;
    }

    const task = cron.schedule(
      SCHEDULER_CONFIG.CRON_EXPRESSION,
      async () => {
        await this.executeJob();
      },
      { timezone: SCHEDULER_CONFIG.TIMEZONE },
    );

    global.__dolibarrLeavesSyncSchedulerTask = task;
    global.__dolibarrLeavesSyncSchedulerInitialized = true;

    log.info(
      {
        cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION,
        timezone: SCHEDULER_CONFIG.TIMEZONE,
      },
      'Dolibarr Leaves Sync scheduler initialized',
    );
  }

  private static async executeJob(): Promise<void> {
    if (this.isRunning) {
      log.info({}, 'Job already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      // Cron runs need a triggeredById for the audit log. Pick any CEO user
      // as the system actor — CEOs are always present per prisma/seed.ts.
      const ceoUser = await prisma.user.findFirst({
        where: { role: { name: 'CEO' }, status: 'active' },
        select: { id: true },
      });
      if (!ceoUser) {
        log.error({}, 'No CEO user found to use as cron trigger; skipping');
        return;
      }

      const { runDolibarrLeaveSync } = await import('@/lib/services/hr/sync-dolibarr-leaves');
      const result = await runDolibarrLeaveSync({
        triggeredById: ceoUser.id,
        triggerSource: 'cron',
      });
      log.info({ result }, 'Dolibarr Leaves Sync cron completed');
    } catch (error) {
      log.error({ error }, 'Dolibarr Leaves Sync cron failed');
    } finally {
      this.isRunning = false;
    }
  }

  static async runNow(): Promise<void> {
    log.info({}, 'Manual execution triggered');
    await this.executeJob();
  }

  static stop(): void {
    if (global.__dolibarrLeavesSyncSchedulerTask) {
      global.__dolibarrLeavesSyncSchedulerTask.stop();
      global.__dolibarrLeavesSyncSchedulerInitialized = false;
      log.info({}, 'Scheduler stopped');
    }
  }

  static getStatus(): {
    enabled: boolean;
    initialized: boolean;
    isRunning: boolean;
  } {
    return {
      enabled: this.isEnabled(),
      initialized: global.__dolibarrLeavesSyncSchedulerInitialized || false,
      isRunning: this.isRunning,
    };
  }
}

export default DolibarrLeavesSyncScheduler;
