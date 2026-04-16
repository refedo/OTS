import * as cron from 'node-cron';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'OpsAgentScheduler' });

const SCHEDULER_CONFIG = {
  JOB_NAME: 'OpsAgent',
  DEFAULT_CRON: '0 7 * * 0-4',
  TIMEZONE: 'Asia/Riyadh',
};

declare global {
  // eslint-disable-next-line no-var
  var __opsAgentSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __opsAgentSchedulerTask: cron.ScheduledTask | undefined;
}

export class OpsAgentScheduler {
  private static isRunning = false;

  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_OPS_AGENT_SCHEDULER;
    if (envValue === undefined) return process.env.NODE_ENV === 'production';
    return envValue === 'true' || envValue === '1';
  }

  static initialize(): void {
    if (global.__opsAgentSchedulerInitialized) {
      log.info({}, 'Scheduler already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.info({ enabled: process.env.ENABLE_OPS_AGENT_SCHEDULER }, 'Ops Agent scheduler disabled');
      return;
    }

    const cronExpr = process.env.OPS_AGENT_CRON_SCHEDULE ?? SCHEDULER_CONFIG.DEFAULT_CRON;

    if (!cron.validate(cronExpr)) {
      log.error({ cronExpr }, 'Invalid cron expression for Ops Agent scheduler');
      return;
    }

    const task = cron.schedule(
      cronExpr,
      async () => {
        await this.executeJob();
      },
      { timezone: SCHEDULER_CONFIG.TIMEZONE },
    );

    global.__opsAgentSchedulerTask = task;
    global.__opsAgentSchedulerInitialized = true;

    log.info({ cronExpr, timezone: SCHEDULER_CONFIG.TIMEZONE }, 'Ops Agent scheduler initialized');
  }

  private static async executeJob(): Promise<void> {
    if (this.isRunning) {
      log.info({}, 'Job already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      const secret = process.env.OTS_INTERNAL_API_SECRET || process.env.CRON_SECRET;
      if (!secret) {
        log.error({}, 'No secret configured — skipping ops agent cron run');
        return;
      }

      const baseUrl =
        process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

      const res = await fetch(`${baseUrl}${basePath}/api/ops-agent/cron`, {
        method: 'POST',
        headers: { 'x-ots-agent-secret': secret },
      });

      const result = await res.json();
      log.info({ result }, 'Ops Agent cron completed');
    } catch (error) {
      log.error({ error }, 'Ops Agent cron failed');
    } finally {
      this.isRunning = false;
    }
  }

  static async runNow(): Promise<void> {
    log.info({}, 'Manual execution triggered');
    await this.executeJob();
  }

  static stop(): void {
    if (global.__opsAgentSchedulerTask) {
      global.__opsAgentSchedulerTask.stop();
      global.__opsAgentSchedulerInitialized = false;
      log.info({}, 'Scheduler stopped');
    }
  }

  static getStatus(): { enabled: boolean; initialized: boolean; isRunning: boolean } {
    return {
      enabled: this.isEnabled(),
      initialized: global.__opsAgentSchedulerInitialized ?? false,
      isRunning: this.isRunning,
    };
  }
}

export default OpsAgentScheduler;
