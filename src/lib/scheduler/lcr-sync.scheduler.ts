import * as cron from 'node-cron';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'LcrSyncScheduler' });

const SCHEDULER_CONFIG = {
  JOB_NAME: 'LcrSync',
  TIMEZONE: 'Asia/Riyadh',
};

declare global {
  // eslint-disable-next-line no-var
  var __lcrSyncSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __lcrSyncSchedulerTask: cron.ScheduledTask | undefined;
}

export class LcrSyncScheduler {
  private static isRunning = false;

  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_LCR_SCHEDULER;
    if (envValue === undefined) {
      return process.env.NODE_ENV === 'production';
    }
    return envValue === 'true' || envValue === '1';
  }

  static initialize(): void {
    if (global.__lcrSyncSchedulerInitialized) {
      log.info({}, 'Scheduler already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.info({ enabled: process.env.ENABLE_LCR_SCHEDULER }, 'Scheduler disabled');
      return;
    }

    const intervalMinutes = parseInt(process.env.LCR_SYNC_INTERVAL_MINUTES ?? '30', 10);
    const cronExpression = `*/${intervalMinutes} * * * *`;

    if (!cron.validate(cronExpression)) {
      log.error({ cronExpression }, 'Invalid cron expression');
      return;
    }

    const task = cron.schedule(
      cronExpression,
      async () => {
        await this.executeJob();
      },
      { timezone: SCHEDULER_CONFIG.TIMEZONE },
    );

    global.__lcrSyncSchedulerTask = task;
    global.__lcrSyncSchedulerInitialized = true;

    log.info({ cronExpression, timezone: SCHEDULER_CONFIG.TIMEZONE }, 'LCR Sync scheduler initialized');
  }

  private static async executeJob(): Promise<void> {
    if (this.isRunning) {
      log.info({}, 'Job already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      const { runLcrSync } = await import('@/lib/sync/lcrSync');
      const result = await runLcrSync('cron');
      log.info({ result }, 'LCR Sync cron completed');
    } catch (error) {
      log.error({ error }, 'LCR Sync cron failed');
    } finally {
      this.isRunning = false;
    }
  }

  static async runNow(): Promise<void> {
    log.info({}, 'Manual execution triggered');
    await this.executeJob();
  }

  static stop(): void {
    if (global.__lcrSyncSchedulerTask) {
      global.__lcrSyncSchedulerTask.stop();
      global.__lcrSyncSchedulerInitialized = false;
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
      initialized: global.__lcrSyncSchedulerInitialized || false,
      isRunning: this.isRunning,
    };
  }
}

export default LcrSyncScheduler;
