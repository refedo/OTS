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
    const { registerIntegrationListeners } = await import('@/lib/events/integration-listeners');

    // Initialize the Early Warning Engine scheduler
    EarlyWarningScheduler.initialize();

    // Initialize the LCR Sync scheduler (Supply Chain module)
    LcrSyncScheduler.initialize();

    // Register integration event listeners (open-audit, Libre MES, …)
    registerIntegrationListeners();
  }
}
