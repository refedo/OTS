import * as cron from 'node-cron';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'AbsenceEscalationScheduler' });

const SCHEDULER_CONFIG = {
  JOB_NAME: 'AbsenceEscalation',
  // Daily at 07:00 Riyadh — runs AFTER the 06:00 PTS attendance sync so the
  // ANP data evaluated here is fresh for the day.
  CRON_EXPRESSION: '0 7 * * *',
  TIMEZONE: 'Asia/Riyadh',
};

declare global {
  // eslint-disable-next-line no-var
  var __absenceEscalationSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __absenceEscalationSchedulerTask: cron.ScheduledTask | undefined;
}

export class AbsenceEscalationScheduler {
  private static isRunning = false;

  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_ABSENCE_ESCALATION_SCHEDULER;
    if (envValue === undefined) {
      return process.env.NODE_ENV === 'production';
    }
    return envValue === 'true' || envValue === '1';
  }

  static initialize(): void {
    if (global.__absenceEscalationSchedulerInitialized) {
      log.info({}, 'Scheduler already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.info({ enabled: process.env.ENABLE_ABSENCE_ESCALATION_SCHEDULER }, 'Scheduler disabled');
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

    global.__absenceEscalationSchedulerTask = task;
    global.__absenceEscalationSchedulerInitialized = true;

    log.info(
      { cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION, timezone: SCHEDULER_CONFIG.TIMEZONE },
      'Absence Escalation scheduler initialized',
    );
  }

  private static async executeJob(): Promise<void> {
    if (this.isRunning) {
      log.info({}, 'Job already running, skipping');
      return;
    }

    this.isRunning = true;
    try {
      const ceoUser = await prisma.user.findFirst({
        where: { role: { name: 'CEO' }, status: 'active' },
        select: { id: true },
      });

      const { evaluateAbsenceEscalations } = await import('@/lib/services/hr/absence-escalation.service');
      const result = await evaluateAbsenceEscalations({ triggeredById: ceoUser?.id });
      log.info(
        { evaluated: result.evaluated, created: result.created, notified: result.notified },
        'Absence escalation cron completed',
      );
    } catch (error) {
      log.error({ error }, 'Absence escalation cron failed');
    } finally {
      this.isRunning = false;
    }
  }

  static async runNow(): Promise<void> {
    log.info({}, 'Manual execution triggered');
    await this.executeJob();
  }

  static stop(): void {
    if (global.__absenceEscalationSchedulerTask) {
      global.__absenceEscalationSchedulerTask.stop();
    }
    global.__absenceEscalationSchedulerInitialized = false;
    log.info({}, 'Scheduler stopped');
  }
}
