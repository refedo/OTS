import { NextRequest, NextResponse } from 'next/server';
import { FinancialSyncService, isSyncRunning } from '@/lib/dolibarr/financial-sync-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes for full sync

const VALID_ENTITIES = ['bank_accounts', 'projects', 'customer_invoices', 'supplier_invoices', 'payments', 'salaries', 'journal_entries'];

export async function POST(request: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  try {
    // Check if a sync is already running
    if (isSyncRunning()) {
      return NextResponse.json(
        { error: 'A sync is already in progress. Please wait for it to complete.' },
        { status: 409 }
      );
    }

    const service = new FinancialSyncService();
    const triggeredBy = auth.session.name || 'manual';

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
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const service = new FinancialSyncService();
    const status = await service.getSyncStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[Financial Sync GET] Error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
