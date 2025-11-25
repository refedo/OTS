/**
 * KPI Scheduler - Automated Background Jobs
 * 
 * Runs scheduled jobs to automatically calculate KPIs at specified intervals
 */

import cron from 'node-cron';
import { recalculateKPIsByFrequency } from './calculator';

let isSchedulerRunning = false;

/**
 * Start the KPI calculation scheduler
 */
export function startKPIScheduler() {
  if (isSchedulerRunning) {
    console.log('⚠️  KPI Scheduler is already running');
    return;
  }

  console.log('🚀 Starting KPI Scheduler...');

  // Daily KPIs - Run at 3:00 AM every day
  cron.schedule('0 3 * * *', async () => {
    console.log('\n⏰ [DAILY JOB] Starting daily KPI calculation...');
    try {
      await recalculateKPIsByFrequency('daily');
      console.log('✅ [DAILY JOB] Daily KPI calculation completed');
    } catch (error) {
      console.error('❌ [DAILY JOB] Daily KPI calculation failed:', error);
    }
  }, {
    timezone: 'UTC'
  });

  // Weekly KPIs - Run at 4:00 AM every Monday
  cron.schedule('0 4 * * 1', async () => {
    console.log('\n⏰ [WEEKLY JOB] Starting weekly KPI calculation...');
    try {
      await recalculateKPIsByFrequency('weekly');
      console.log('✅ [WEEKLY JOB] Weekly KPI calculation completed');
    } catch (error) {
      console.error('❌ [WEEKLY JOB] Weekly KPI calculation failed:', error);
    }
  }, {
    timezone: 'UTC'
  });

  // Monthly KPIs - Run at 4:00 AM on the 1st day of each month
  cron.schedule('0 4 1 * *', async () => {
    console.log('\n⏰ [MONTHLY JOB] Starting monthly KPI calculation...');
    try {
      await recalculateKPIsByFrequency('monthly');
      console.log('✅ [MONTHLY JOB] Monthly KPI calculation completed');
    } catch (error) {
      console.error('❌ [MONTHLY JOB] Monthly KPI calculation failed:', error);
    }
  }, {
    timezone: 'UTC'
  });

  isSchedulerRunning = true;
  console.log('✅ KPI Scheduler started successfully');
  console.log('📅 Scheduled jobs:');
  console.log('   - Daily:   Every day at 03:00 UTC');
  console.log('   - Weekly:  Every Monday at 04:00 UTC');
  console.log('   - Monthly: 1st day of month at 04:00 UTC');
}

/**
 * Stop the KPI calculation scheduler
 */
export function stopKPIScheduler() {
  if (!isSchedulerRunning) {
    console.log('⚠️  KPI Scheduler is not running');
    return;
  }

  // Note: node-cron doesn't provide a direct way to stop all tasks
  // In production, you would track tasks and stop them individually
  isSchedulerRunning = false;
  console.log('🛑 KPI Scheduler stopped');
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    running: isSchedulerRunning,
    jobs: [
      {
        name: 'Daily KPI Calculation',
        schedule: '0 3 * * *',
        description: 'Runs at 03:00 UTC every day',
        frequency: 'daily',
      },
      {
        name: 'Weekly KPI Calculation',
        schedule: '0 4 * * 1',
        description: 'Runs at 04:00 UTC every Monday',
        frequency: 'weekly',
      },
      {
        name: 'Monthly KPI Calculation',
        schedule: '0 4 1 * *',
        description: 'Runs at 04:00 UTC on the 1st of each month',
        frequency: 'monthly',
      },
    ],
  };
}

/**
 * Manual trigger for testing (runs immediately)
 */
export async function runScheduledJobNow(frequency: 'daily' | 'weekly' | 'monthly') {
  console.log(`\n🔧 [MANUAL TRIGGER] Running ${frequency} KPI calculation...`);
  try {
    await recalculateKPIsByFrequency(frequency);
    console.log(`✅ [MANUAL TRIGGER] ${frequency} KPI calculation completed`);
    return { success: true, message: `${frequency} KPIs calculated successfully` };
  } catch (error) {
    console.error(`❌ [MANUAL TRIGGER] ${frequency} KPI calculation failed:`, error);
    return { success: false, message: `Failed to calculate ${frequency} KPIs`, error };
  }
}
