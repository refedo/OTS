import * as cron from 'node-cron';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'ContractRemindersScheduler' });

const SCHEDULER_CONFIG = {
  JOB_NAME: 'ContractReminders',
  // Daily at 08:00 Riyadh time — morning run so managers see alerts at the start of the day
  CRON_EXPRESSION: '0 8 * * *',
  TIMEZONE: 'Asia/Riyadh',
};

declare global {
  // eslint-disable-next-line no-var
  var __contractRemindersSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __contractRemindersSchedulerTask: cron.ScheduledTask | undefined;
}

export class ContractRemindersScheduler {
  private static isRunning = false;

  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_CONTRACT_REMINDERS_SCHEDULER;
    if (envValue === undefined) {
      return process.env.NODE_ENV === 'production';
    }
    return envValue === 'true' || envValue === '1';
  }

  static initialize(): void {
    if (global.__contractRemindersSchedulerInitialized) {
      log.info({}, 'Scheduler already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.info(
        { enabled: process.env.ENABLE_CONTRACT_REMINDERS_SCHEDULER },
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

    global.__contractRemindersSchedulerTask = task;
    global.__contractRemindersSchedulerInitialized = true;

    log.info(
      {
        cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION,
        timezone: SCHEDULER_CONFIG.TIMEZONE,
      },
      'Contract Reminders scheduler initialized',
    );
  }

  private static async executeJob(): Promise<void> {
    if (this.isRunning) {
      log.info({}, 'Job already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        log.error({}, 'CRON_SECRET not set — skipping contract reminders run');
        return;
      }

      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

      const res = await fetch(`${baseUrl}${basePath}/api/cron/contract-reminders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cronSecret}` },
      });

      const result = await res.json();
      log.info({ result }, 'Contract Reminders cron completed');
    } catch (error) {
      log.error({ error }, 'Contract Reminders cron failed');
    } finally {
      this.isRunning = false;
    }
  }

  static async runNow(): Promise<void> {
    log.info({}, 'Manual execution triggered');
    await this.executeJob();
  }

  static stop(): void {
    if (global.__contractRemindersSchedulerTask) {
      global.__contractRemindersSchedulerTask.stop();
      global.__contractRemindersSchedulerInitialized = false;
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
      initialized: global.__contractRemindersSchedulerInitialized || false,
      isRunning: this.isRunning,
    };
  }
}

export default ContractRemindersScheduler;
