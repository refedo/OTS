import { NextResponse } from 'next/server';
import { DolibarrSyncService } from '@/lib/dolibarr/sync-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/dolibarr-sync — Protected cron endpoint
 * Called by external cron every 30 minutes.
 * Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const syncService = new DolibarrSyncService();
    const result = await syncService.runFullSync('cron');
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Cron sync failed' }, { status: 500 });
  }
}
