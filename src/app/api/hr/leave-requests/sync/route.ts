/**
 * POST /api/hr/leave-requests/sync — trigger a Dolibarr → OTS leaves sync
 * GET  /api/hr/leave-requests/sync — fetch the sync log history (last 50 runs)
 *
 * Gated by `hr.leaves.sync`. New in 18.6.0.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { runDolibarrLeaveSync } from '@/lib/services/hr/sync-dolibarr-leaves';
import { DolibarrHolidaysNotAvailableError } from '@/lib/dolibarr/dolibarr-client';
import { isDolibarrDbConfigured } from '@/lib/dolibarr/dolibarr-db';

export async function POST() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canSync = await checkPermission('hr.leaves.sync');
  if (!canSync) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await runDolibarrLeaveSync({
      triggeredById: session.sub,
      triggerSource: 'manual',
    });
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[Dolibarr Leaves Sync API] Sync run failed');
    if (error instanceof DolibarrHolidaysNotAvailableError) {
      const dbConfigured = isDolibarrDbConfigured();
      const message = dbConfigured
        ? `${error.message} The MySQL fallback is configured but the Dolibarr database could not be reached — verify DOLIBARR_DB_HOST / port / credentials.`
        : `${error.message} As a workaround, configure the direct MySQL fallback by setting DOLIBARR_DB_HOST, DOLIBARR_DB_PORT, DOLIBARR_DB_USER, DOLIBARR_DB_PASSWORD and DOLIBARR_DB_DATABASE in the OTS environment — the sync will then read llx_holiday directly.`;
      return NextResponse.json({ error: message }, { status: 503 });
    }
    const msg = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.leaves.sync');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const logs = await prisma.dolibarrLeaveSyncLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
    include: {
      triggeredBy: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json(logs);
}
