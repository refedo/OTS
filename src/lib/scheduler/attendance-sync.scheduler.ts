import * as cron from 'node-cron';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'AttendanceSyncScheduler' });

const SCHEDULER_CONFIG = {
  JOB_NAME: 'AttendanceSync',
  // Daily at 06:00 Riyadh — runs before the morning deadline-reminders cron
  // (08:00) so attendance data is fresh when payroll calculations begin.
  CRON_EXPRESSION: '0 6 * * *',
  TIMEZONE: 'Asia/Riyadh',
};

declare global {
  // eslint-disable-next-line no-var
  var __attendanceSyncSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __attendanceSyncSchedulerTask: cron.ScheduledTask | undefined;
}

export class AttendanceSyncScheduler {
  private static isRunning = false;

  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_ATTENDANCE_SYNC_SCHEDULER;
    if (envValue === undefined) {
      return process.env.NODE_ENV === 'production';
    }
    return envValue === 'true' || envValue === '1';
  }

  static initialize(): void {
    if (global.__attendanceSyncSchedulerInitialized) {
      log.info({}, 'Scheduler already initialized, skipping');
      return;
    }

    if (!this.isEnabled()) {
      log.info({ enabled: process.env.ENABLE_ATTENDANCE_SYNC_SCHEDULER }, 'Scheduler disabled');
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

    global.__attendanceSyncSchedulerTask = task;
    global.__attendanceSyncSchedulerInitialized = true;

    log.info(
      { cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION, timezone: SCHEDULER_CONFIG.TIMEZONE },
      'Attendance Sync scheduler initialized',
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
      if (!ceoUser) {
        log.error({}, 'No CEO user found to use as cron trigger; skipping');
        return;
      }

      const { runAttendanceSync } = await import('@/lib/services/hr/sync-attendance-from-sheet');
      const result = await runAttendanceSync({ triggeredById: ceoUser.id });
      log.info(
        {
          status: result.status,
          rowsCreated: result.rowsCreated,
          rowsUpdated: result.rowsUpdated,
          rowsUnchanged: result.rowsUnchanged,
          hardErrors: result.hardErrors.length,
        },
        'Attendance (PTS overtime) sync cron completed',
      );
    } catch (error) {
      log.error({ error }, 'Attendance Sync cron failed');
    } finally {
      this.isRunning = false;
    }
  }

  static async runNow(): Promise<void> {
    log.info({}, 'Manual execution triggered');
    await this.executeJob();
  }

  static stop(): void {
    if (global.__attendanceSyncSchedulerTask) {
      global.__attendanceSyncSchedulerTask.stop();
    }
    global.__attendanceSyncSchedulerInitialized = false;
    log.info({}, 'Scheduler stopped');
  }
}
