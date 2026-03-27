import { NextResponse } from 'next/server';
import { FinancialSyncService, isSyncRunning } from '@/lib/dolibarr/financial-sync-service';
import { systemEventService } from '@/services/system-events.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: Request) {
  // Verify cron secret
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret') || req.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  try {
    if (isSyncRunning()) {
      console.log('[Financial Cron] Sync already in progress — skipping');
      return NextResponse.json({ skipped: true, reason: 'Sync already in progress' });
    }

    const service = new FinancialSyncService();
    const result = await service.runFullSync('cron');

    systemEventService.logSystem('SYS_CRON_EXECUTED', {
      cronJob: 'financial-sync',
      duration: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Financial Cron] Error:', error);
    systemEventService.logSystem('SYS_CRON_FAILED', {
      cronJob: 'financial-sync',
      error: error.message,
      duration: Date.now() - startTime,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
