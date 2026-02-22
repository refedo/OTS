import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { FinancialSyncService, isSyncRunning } from '@/lib/dolibarr/financial-sync-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes for full sync

const VALID_ENTITIES = ['bank_accounts', 'customer_invoices', 'supplier_invoices', 'payments', 'salaries', 'journal_entries'];

export async function POST(request: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Check if a sync is already running
    if (isSyncRunning()) {
      return NextResponse.json(
        { error: 'A sync is already in progress. Please wait for it to complete.' },
        { status: 409 }
      );
    }

    const service = new FinancialSyncService();
    const triggeredBy = session.name || 'manual';

    // Check for partial sync via query param or body
    const url = new URL(request.url);
    const entitiesParam = url.searchParams.get('entities');

    if (entitiesParam) {
      const entities = entitiesParam.split(',').filter(e => VALID_ENTITIES.includes(e));
      if (entities.length === 0) {
        return NextResponse.json({ error: `Invalid entities. Valid: ${VALID_ENTITIES.join(', ')}` }, { status: 400 });
      }
      const result = await service.runPartialSync(entities, triggeredBy);
      return NextResponse.json(result);
    }

    // Full sync
    const result = await service.runFullSync(triggeredBy);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Financial Sync API] Error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const service = new FinancialSyncService();
    const status = await service.getSyncStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[Financial Sync GET] Error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
