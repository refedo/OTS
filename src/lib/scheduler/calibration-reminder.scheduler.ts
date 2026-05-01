import * as cron from 'node-cron';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'CalibrationReminderScheduler' });

const SCHEDULER_CONFIG = {
  JOB_NAME: 'CalibrationReminder',
  // Daily at 08:00 Riyadh time — morning run for asset managers
  CRON_EXPRESSION: '0 8 * * *',
  TIMEZONE: 'Asia/Riyadh',
};

declare global {
  // eslint-disable-next-line no-var
  var __calibrationReminderSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __calibrationReminderSchedulerTask: cron.ScheduledTask | undefined;
}

export class CalibrationReminderScheduler {
  private static isRunning = false;

  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_CALIBRATION_REMINDER_SCHEDULER;
    if (envValue === undefined) return process.env.NODE_ENV === 'production';
    return envValue === 'true' || envValue === '1';
  }

  static initialize(): void {
    if (global.__calibrationReminderSchedulerInitialized) {
      log.info({}, 'Calibration reminder scheduler already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.info({ enabled: process.env.ENABLE_CALIBRATION_REMINDER_SCHEDULER }, 'Calibration reminder scheduler disabled');
      return;
    }

    if (!cron.validate(SCHEDULER_CONFIG.CRON_EXPRESSION)) {
      log.error({ cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION }, 'Invalid cron expression');
      return;
    }

    const task = cron.schedule(
      SCHEDULER_CONFIG.CRON_EXPRESSION,
      async () => { await this.executeJob(); },
      { timezone: SCHEDULER_CONFIG.TIMEZONE },
    );

    global.__calibrationReminderSchedulerTask = task;
    global.__calibrationReminderSchedulerInitialized = true;

    log.info({ cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION, timezone: SCHEDULER_CONFIG.TIMEZONE },
      'Calibration Reminder scheduler initialized');
  }

  private static async executeJob(): Promise<void> {
    if (this.isRunning) {
      log.info({}, 'Calibration reminder job already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        log.error({}, 'CRON_SECRET not set — skipping calibration reminder run');
        return;
      }

      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

      const res = await fetch(`${baseUrl}${basePath}/api/cron/calibration-reminder`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cronSecret}` },
      });

      const result = await res.json();
      log.info({ result }, 'Calibration reminder cron completed');
    } catch (error) {
      log.error({ error }, 'Calibration reminder cron failed');
    } finally {
      this.isRunning = false;
    }
  }

  static async runNow(): Promise<void> {
    log.info({}, 'Manual execution triggered');
    await this.executeJob();
  }

  static stop(): void {
    if (global.__calibrationReminderSchedulerTask) {
      global.__calibrationReminderSchedulerTask.stop();
      global.__calibrationReminderSchedulerInitialized = false;
      log.info({}, 'Calibration reminder scheduler stopped');
    }
  }
}

export default CalibrationReminderScheduler;
