/**
 * Early Warning Engine Scheduler
 * 
 * Automatically triggers the Early Warning Engine on a schedule.
 * 
 * Features:
 * - Runs every 1 hour by default
 * - Singleton guard prevents duplicate instances
 * - Environment toggle (ENABLE_RISK_SCHEDULER)
 * - Safe error handling (never crashes the app)
 * - Minimal logging for observability
 */

import * as cron from 'node-cron';
import { EarlyWarningEngineService } from '@/lib/services/early-warning-engine.service';

// ============================================
// CONFIGURATION
// ============================================

const SCHEDULER_CONFIG = {
  // Cron expression: Daily at 2:00 AM
  // Format: minute hour day-of-month month day-of-week
  CRON_EXPRESSION: '0 2 * * *', // Daily at 2:00 AM
  
  // Timezone (optional, uses server timezone by default)
  TIMEZONE: 'Asia/Riyadh',
  
  // Job name for logging
  JOB_NAME: 'EarlyWarningEngine',
};

// ============================================
// SINGLETON GUARD
// ============================================

// Global flag to prevent multiple scheduler instances
// This survives hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __earlyWarningSchedulerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __earlyWarningSchedulerTask: cron.ScheduledTask | undefined;
}

// ============================================
// SCHEDULER CLASS
// ============================================

export class EarlyWarningScheduler {
  private static isRunning = false;

  /**
   * Check if scheduler is enabled via environment variable
   */
  static isEnabled(): boolean {
    const envValue = process.env.ENABLE_RISK_SCHEDULER;
    
    // Default: false in development, true in production
    if (envValue === undefined) {
      return process.env.NODE_ENV === 'production';
    }
    
    return envValue === 'true' || envValue === '1';
  }

  /**
   * Initialize the scheduler (singleton)
   * Call this once on server startup
   */
  static initialize(): void {
    // Check if already initialized (singleton guard)
    if (global.__earlyWarningSchedulerInitialized) {
      console.log(`[${SCHEDULER_CONFIG.JOB_NAME}] Scheduler already initialized, skipping`);
      return;
    }

    // Check if enabled
    if (!this.isEnabled()) {
      console.log(`[${SCHEDULER_CONFIG.JOB_NAME}] Scheduler disabled (ENABLE_RISK_SCHEDULER=${process.env.ENABLE_RISK_SCHEDULER})`);
      return;
    }

    // Validate cron expression
    if (!cron.validate(SCHEDULER_CONFIG.CRON_EXPRESSION)) {
      console.error(`[${SCHEDULER_CONFIG.JOB_NAME}] Invalid cron expression: ${SCHEDULER_CONFIG.CRON_EXPRESSION}`);
      return;
    }

    // Create the scheduled task
    const task = cron.schedule(
      SCHEDULER_CONFIG.CRON_EXPRESSION,
      async () => {
        await this.executeJob();
      },
      {
        timezone: SCHEDULER_CONFIG.TIMEZONE,
      }
    );

    // Store reference globally
    global.__earlyWarningSchedulerTask = task;
    global.__earlyWarningSchedulerInitialized = true;

    console.log(`[${SCHEDULER_CONFIG.JOB_NAME}] ✓ Scheduler initialized`);
    console.log(`[${SCHEDULER_CONFIG.JOB_NAME}]   Schedule: ${SCHEDULER_CONFIG.CRON_EXPRESSION} (daily at 2:00 AM)`);
    console.log(`[${SCHEDULER_CONFIG.JOB_NAME}]   Timezone: ${SCHEDULER_CONFIG.TIMEZONE}`);
    console.log(`[${SCHEDULER_CONFIG.JOB_NAME}]   Next run: ${this.getNextRunTime()}`);
  }

  /**
   * Execute the Early Warning Engine job
   */
  private static async executeJob(): Promise<void> {
    // Prevent concurrent executions
    if (this.isRunning) {
      console.log(`[${SCHEDULER_CONFIG.JOB_NAME}] Job already running, skipping this execution`);
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    console.log(`[${SCHEDULER_CONFIG.JOB_NAME}] ▶ Starting execution at ${startTime.toISOString()}`);

    try {
      // Call the Early Warning Engine service directly
      const result = await EarlyWarningEngineService.runAllRules();

      console.log(`[${SCHEDULER_CONFIG.JOB_NAME}] ✓ Execution completed`);
      console.log(`[${SCHEDULER_CONFIG.JOB_NAME}]   Duration: ${result.duration}ms`);
      console.log(`[${SCHEDULER_CONFIG.JOB_NAME}]   Risks detected: ${result.totalRisksDetected}`);
      console.log(`[${SCHEDULER_CONFIG.JOB_NAME}]   Risks created: ${result.totalRisksCreated}`);

      // Log rule-level details if any risks were found
      if (result.totalRisksDetected > 0) {
        for (const rule of result.ruleResults) {
          if (rule.risksDetected > 0) {
            console.log(`[${SCHEDULER_CONFIG.JOB_NAME}]   - ${rule.ruleName}: ${rule.risksDetected} detected, ${rule.risksCreated} new`);
          }
          if (rule.errors.length > 0) {
            console.error(`[${SCHEDULER_CONFIG.JOB_NAME}]   ⚠ ${rule.ruleName} errors:`, rule.errors);
          }
        }
      }
    } catch (error) {
      // Log error but never crash the app
      console.error(`[${SCHEDULER_CONFIG.JOB_NAME}] ✗ Execution failed:`, error instanceof Error ? error.message : error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger the job (for testing or on-demand execution)
   */
  static async runNow(): Promise<void> {
    console.log(`[${SCHEDULER_CONFIG.JOB_NAME}] Manual execution triggered`);
    await this.executeJob();
  }

  /**
   * Stop the scheduler
   */
  static stop(): void {
    if (global.__earlyWarningSchedulerTask) {
      global.__earlyWarningSchedulerTask.stop();
      global.__earlyWarningSchedulerInitialized = false;
      console.log(`[${SCHEDULER_CONFIG.JOB_NAME}] Scheduler stopped`);
    }
  }

  /**
   * Get the next scheduled run time (approximate)
   */
  private static getNextRunTime(): string {
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);
    // If 2 AM already passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }

  /**
   * Get scheduler status
   */
  static getStatus(): {
    enabled: boolean;
    initialized: boolean;
    isRunning: boolean;
    cronExpression: string;
    timezone: string;
  } {
    return {
      enabled: this.isEnabled(),
      initialized: global.__earlyWarningSchedulerInitialized || false,
      isRunning: this.isRunning,
      cronExpression: SCHEDULER_CONFIG.CRON_EXPRESSION,
      timezone: SCHEDULER_CONFIG.TIMEZONE,
    };
  }
}

export default EarlyWarningScheduler;
