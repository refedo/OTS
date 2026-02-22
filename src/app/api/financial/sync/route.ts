import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { FinancialSyncService } from '@/lib/dolibarr/financial-sync-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for full sync

export async function POST() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const service = new FinancialSyncService();
    const result = await service.runFullSync(session.name || 'manual');
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
