import { NextRequest, NextResponse } from 'next/server';
import { FinancialSyncService, isSyncRunning } from '@/lib/dolibarr/financial-sync-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { systemEventService } from '@/services/system-events.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 600; // 10 minutes for full sync

const VALID_ENTITIES = ['bank_accounts', 'projects', 'customer_invoices', 'supplier_invoices', 'payments', 'salaries', 'journal_entries'];

export async function POST(request: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const userId = auth.session.sub;
  const userName = auth.session.name;

  try {
    // Check if a sync is already running
    if (isSyncRunning()) {
      return NextResponse.json(
        { error: 'A sync is already in progress. Please wait for it to complete.' },
        { status: 409 }
      );
    }

    const service = new FinancialSyncService();
    const triggeredBy = userName || 'manual';
    const correlationId = systemEventService.generateCorrelationId();

    // Check for partial sync via query param or body
    const url = new URL(request.url);
    const entitiesParam = url.searchParams.get('entities');
    const syncType = entitiesParam ? 'partial' : 'full';

    systemEventService.logFinancial('FIN_SYNC_STARTED', userId, {
      userName,
      syncType,
    });

    const startTime = Date.now();

    if (entitiesParam) {
      const entities = entitiesParam.split(',').filter(e => VALID_ENTITIES.includes(e));
      if (entities.length === 0) {
        return NextResponse.json({ error: `Invalid entities. Valid: ${VALID_ENTITIES.join(', ')}` }, { status: 400 });
      }
      const result = await service.runPartialSync(entities, triggeredBy);
      systemEventService.logFinancial('FIN_SYNC_COMPLETED', userId, {
        userName,
        syncType,
        duration: Date.now() - startTime,
      });
      return NextResponse.json({ ...result, correlationId });
    }

    // Full sync
    const result = await service.runFullSync(triggeredBy);
    systemEventService.logFinancial('FIN_SYNC_COMPLETED', userId, {
      userName,
      syncType,
      duration: Date.now() - startTime,
    });
    return NextResponse.json({ ...result, correlationId });
  } catch (error: any) {
    console.error('[Financial Sync API] Error:', error);
    systemEventService.logFinancial('FIN_SYNC_FAILED', userId, {
      userName,
      error: error.message,
    });
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
