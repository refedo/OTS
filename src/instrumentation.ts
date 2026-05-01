/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts.
 * Used to initialize server-side services like schedulers.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import to avoid client-side bundling
    const { EarlyWarningScheduler } = await import('@/lib/scheduler/early-warning.scheduler');
    const { LcrSyncScheduler } = await import('@/lib/scheduler/lcr-sync.scheduler');
    const { DolibarrLeavesSyncScheduler } = await import('@/lib/scheduler/dolibarr-leaves-sync.scheduler');
    const { ContractRemindersScheduler } = await import('@/lib/scheduler/contract-reminders.scheduler');
    const { OpsAgentScheduler } = await import('@/lib/scheduler/ops-agent.scheduler');
    const { AttendanceSyncScheduler } = await import('@/lib/scheduler/attendance-sync.scheduler');
    const { CalibrationReminderScheduler } = await import('@/lib/scheduler/calibration-reminder.scheduler');
    const { ensureOpsAgentConfig } = await import('@/lib/ops-agent/seeder');
    const { registerIntegrationListeners } = await import('@/lib/events/integration-listeners');
    const { runStartupMigrations } = await import('@/lib/startup-migrations');

    // Run idempotent SQL migrations (18.11.0+)
    await runStartupMigrations();

    // Initialize the Early Warning Engine scheduler
    EarlyWarningScheduler.initialize();

    // Initialize the LCR Sync scheduler (Supply Chain module)
    LcrSyncScheduler.initialize();

    // Initialize the nightly Dolibarr Leaves Sync scheduler (HR module, 18.6.0)
    DolibarrLeavesSyncScheduler.initialize();

    // Initialize the daily Contract Reminders scheduler (HR module, 18.14.0)
    ContractRemindersScheduler.initialize();

    // Seed default OpsAgentConfig if missing (18.19.0)
    await ensureOpsAgentConfig();

    // Initialize the Ops Agent scheduler (18.19.0) — Sat–Wed 07:00 Riyadh
    OpsAgentScheduler.initialize();

    // Initialize the daily PTS Attendance & Overtime Sync scheduler (HR module, 19.6.0)
    AttendanceSyncScheduler.initialize();

    // Initialize the daily Calibration Due Reminder scheduler (IMS module, 22.2.0)
    CalibrationReminderScheduler.initialize();

    // Register integration event listeners (open-audit, Libre MES, …)
    registerIntegrationListeners();
  }
}
