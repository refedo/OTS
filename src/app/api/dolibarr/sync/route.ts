import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { DolibarrSyncService } from '@/lib/dolibarr/sync-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dolibarr/sync — Get sync status, history, and record counts
 */
export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const syncService = new DolibarrSyncService();
    const status = await syncService.getSyncStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to get sync status' }, { status: 500 });
  }
}

/**
 * POST /api/dolibarr/sync — Trigger manual sync
 * Body: { entityType?: 'products' | 'thirdparties' | 'contacts' }
 * If no entityType, runs full sync.
 */
export async function POST(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch { /* empty body = full sync */ }

    const syncService = new DolibarrSyncService();
    const entityType = body?.entityType;

    if (entityType === 'products') {
      const result = await syncService.syncProducts('manual');
      return NextResponse.json(result);
    } else if (entityType === 'thirdparties') {
      const result = await syncService.syncThirdParties('manual');
      return NextResponse.json(result);
    } else if (entityType === 'contacts') {
      const result = await syncService.syncContacts('manual');
      return NextResponse.json(result);
    } else {
      const result = await syncService.runFullSync('manual');
      return NextResponse.json(result);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
