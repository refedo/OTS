/**
 * POST /api/hr/employees/sync — trigger a Dolibarr → OTS employee sync
 * GET  /api/hr/employees/sync — fetch the sync log history (last 50 runs)
 *
 * Gated by `hr.employee.sync`. Rejects POST with HTTP 409 if identity
 * reconciliation has not yet been completed — the sync service throws
 * `ReconciliationRequiredError` in that case.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import {
  runDolibarrEmployeeSync,
  ReconciliationRequiredError,
} from '@/lib/services/hr/sync-dolibarr-employees';

export async function POST() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canSync = await checkPermission('hr.employee.sync');
  if (!canSync) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await runDolibarrEmployeeSync({ triggeredById: session.sub });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReconciliationRequiredError) {
      return NextResponse.json(
        {
          error: 'Identity reconciliation incomplete',
          message: error.message,
          code: 'RECONCILIATION_REQUIRED',
        },
        { status: 409 },
      );
    }
    logger.error({ error }, '[HR Sync API] Sync run failed');
    const msg = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.employee.sync');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const logs = await prisma.dolibarrEmployeeSyncLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
    include: {
      triggeredBy: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json(logs);
}
