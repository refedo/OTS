import { NextResponse } from 'next/server';
import { runLcrSync } from '@/lib/sync/lcrSync';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

const log = logger.child({ module: 'Cron:LcrSync' });

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  try {
    const result = await runLcrSync('cron');
    log.info({ result }, 'Cron LCR sync completed');

    systemEventService.logSystem('SYS_CRON_EXECUTED', {
      cronJob: 'lcr-sync',
      duration: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cron sync failed';
    log.error({ error }, 'Cron LCR sync failed');
    systemEventService.logSystem('SYS_CRON_FAILED', {
      cronJob: 'lcr-sync',
      error: message,
      duration: Date.now() - startTime,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
