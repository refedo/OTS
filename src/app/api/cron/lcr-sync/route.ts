import { NextResponse } from 'next/server';
import { runLcrSync } from '@/lib/sync/lcrSync';
import { logger } from '@/lib/logger';

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

  try {
    const result = await runLcrSync('cron');
    log.info({ result }, 'Cron LCR sync completed');
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cron sync failed';
    log.error({ error }, 'Cron LCR sync failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
