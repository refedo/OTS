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
    const { logger } = await import('@/lib/logger');
    const startupStart = Date.now();

    // Catch process-level crashes so we can see what's causing 502s
    process.on('uncaughtException', (err: Error) => {
      logger.error({ error: err, uptimeSec: Math.round(process.uptime()) }, '[Process] Uncaught exception');
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error({ reason, uptimeSec: Math.round(process.uptime()) }, '[Process] Unhandled promise rejection');
    });

    // Log memory every 5 minutes to catch leaks / pressure leading to 502s
    const memTimer = setInterval(() => {
      const mem = process.memoryUsage();
      const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
      const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);
      const rssMb = Math.round(mem.rss / 1024 / 1024);
      if (heapUsedMb > 800) {
        logger.warn({ heapUsedMb, heapTotalMb, rssMb, uptimeSec: Math.round(process.uptime()) }, '[Process] High memory usage');
      } else {
        logger.info({ heapUsedMb, heapTotalMb, rssMb }, '[Process] Memory usage');
      }
    }, 5 * 60 * 1000);
    // unref so this interval won't block a clean process exit
    (memTimer as unknown as { unref(): void }).unref();

    // Dynamically import to avoid client-side bundling
    const { EarlyWarningScheduler } = await import('@/lib/scheduler/early-warning.scheduler');
    const { LcrSyncScheduler } = await import('@/lib/scheduler/lcr-sync.scheduler');
    const { DolibarrLeavesSyncScheduler } = await import('@/lib/scheduler/dolibarr-leaves-sync.scheduler');
    const { ContractRemindersScheduler } = await import('@/lib/scheduler/contract-reminders.scheduler');
    const { OpsAgentScheduler } = await import('@/lib/scheduler/ops-agent.scheduler');
    const { AttendanceSyncScheduler } = await import('@/lib/scheduler/attendance-sync.scheduler');
    const { CalibrationReminderScheduler } = await import('@/lib/scheduler/calibration-reminder.scheduler');
    const { HrMonthlyReportScheduler } = await import('@/lib/scheduler/hr-monthly-report.scheduler');
    const { ensureOpsAgentConfig } = await import('@/lib/ops-agent/seeder');
    const { registerIntegrationListeners } = await import('@/lib/events/integration-listeners');
    const { runStartupMigrations } = await import('@/lib/startup-migrations');

    // Run idempotent SQL migrations (18.11.0+)
    await runStartupMigrations();

    // Warm up the Prisma engine so the first HTTP requests don't race against
    // engine startup and get "Engine is not yet connected" errors.
    const { db } = await import('@/lib/middleware/db-connection-pool');
    await db.$connect();

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

    // Initialize the monthly HR Report scheduler (HR module, 23.2.0)
    HrMonthlyReportScheduler.initialize();

    // Register integration event listeners (open-audit, Libre MES, …)
    registerIntegrationListeners();

    // Retroactive MIR stock-in: sync any received MIRs that were never posted to inventory
    const { backfillMirStockIn } = await import('@/lib/services/qc/mir-stock-sync.service');
    backfillMirStockIn().catch(err =>
      logger.error({ err }, '[Startup] MIR stock backfill failed'),
    );

    logger.info({ durationMs: Date.now() - startupStart }, '[Startup] Server initialization complete');
  }
}
