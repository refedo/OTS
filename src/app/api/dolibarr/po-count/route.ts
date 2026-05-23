/**
 * GET /api/dolibarr/po-count
 * Returns the total number of purchase orders from Dolibarr (lightweight — no enrichment).
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await cookies();
  const token = store.get(env.COOKIE_NAME)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = createDolibarrClient();
    // Fetch in pages of 500 until exhausted — no enrichment, just count
    let total = 0;
    let page = 0;
    const batchSize = 500;
    while (true) {
      const batch = await client.getPurchaseOrders({ limit: batchSize, page, sortfield: 't.rowid', sortorder: 'DESC' });
      total += batch.length;
      if (batch.length < batchSize) break;
      page++;
    }
    return NextResponse.json({ total });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to count purchase orders';
    logger.warn({ error }, 'Failed to count Dolibarr POs');
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
