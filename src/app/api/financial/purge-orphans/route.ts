import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { FinancialSyncService, isSyncRunning } from '@/lib/dolibarr/financial-sync-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/financial/purge-orphans
 * Hard-refreshes OTS financial data by deactivating invoices and deleting
 * payments that no longer exist in Dolibarr.
 * Requires an authenticated session.
 */
export async function POST(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (isSyncRunning()) {
    return NextResponse.json(
      { error: 'A sync is already running — please wait for it to finish before purging.' },
      { status: 409 }
    );
  }

  try {
    const syncService = new FinancialSyncService();
    const result = await syncService.purgeOrphanedRecords(session.sub ?? 'manual');
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
