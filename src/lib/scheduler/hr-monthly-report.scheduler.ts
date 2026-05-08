/**
 * HR Monthly Report Scheduler — v23.2.0
 *
 * Fires on the 2nd of each month at 06:00 Asia/Riyadh, generating
 * the previous month's HR report. Running on the 2nd (not the 1st)
 * gives payroll one extra day to be approved/locked after month-end.
 */

import * as cron from 'node-cron';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'HrMonthlyReportScheduler' });

const SCHEDULER_CONFIG = {
  JOB_NAME:        'HrMonthlyReport',
  // 06:00 Riyadh on the 2nd of each month
  CRON_EXPRESSION: '0 6 2 * *',
  TIMEZONE:        'Asia/Riyadh',
};

declare global {
  // eslint-disable-next-line no-var
  var __hrMonthlyReportSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __hrMonthlyReportSchedulerTask: cron.ScheduledTask | undefined;
}

export class HrMonthlyReportScheduler {
  private static isRunning = false;

  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_HR_MONTHLY_REPORT_SCHEDULER;
    if (envValue === undefined) {
      return process.env.NODE_ENV === 'production';
    }
    return envValue === 'true' || envValue === '1';
  }

  static initialize(): void {
    if (global.__hrMonthlyReportSchedulerInitialized) {
      log.info({}, 'Scheduler already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.info(
        { enabled: process.env.ENABLE_HR_MONTHLY_REPORT_SCHEDULER },
        'HR Monthly Report scheduler disabled',
      );
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

    global.__hrMonthlyReportSchedulerTask = task;
    global.__hrMonthlyReportSchedulerInitialized = true;

    log.info(
      { cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION, timezone: SCHEDULER_CONFIG.TIMEZONE },
      'HR Monthly Report scheduler initialized',
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
        log.error({}, 'CRON_SECRET not set — skipping HR monthly report run');
        return;
      }

      const baseUrl  = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

      const res = await fetch(`${baseUrl}${basePath}/api/cron/hr-monthly-report`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${cronSecret}` },
      });

      const result = await res.json();
      log.info({ result }, 'HR Monthly Report cron completed');
    } catch (error) {
      log.error({ error }, 'HR Monthly Report cron failed');
    } finally {
      this.isRunning = false;
    }
  }

  static async runNow(): Promise<void> {
    log.info({}, 'Manual execution triggered');
    await this.executeJob();
  }

  static stop(): void {
    if (global.__hrMonthlyReportSchedulerTask) {
      global.__hrMonthlyReportSchedulerTask.stop();
      global.__hrMonthlyReportSchedulerInitialized = false;
      log.info({}, 'Scheduler stopped');
    }
  }

  static getStatus(): { enabled: boolean; initialized: boolean; isRunning: boolean } {
    return {
      enabled:     this.isEnabled(),
      initialized: global.__hrMonthlyReportSchedulerInitialized || false,
      isRunning:   this.isRunning,
    };
  }
}

export default HrMonthlyReportScheduler;
