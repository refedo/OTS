/**
 * GET /api/hr/leave-requests/db-ping — lightweight connectivity probe for
 * the direct-MySQL Dolibarr pool (18.8.0).
 *
 * Runs `SELECT VERSION()` + a COUNT of approved holidays against
 * `<prefix>holiday`. Used by admins to verify end-to-end reachability
 * from the browser before firing a real sync. Gated by `hr.leaves.sync`
 * so only HR-level users can poke the connection.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { pingDolibarrDb, DolibarrDbNotConfiguredError } from '@/lib/dolibarr/dolibarr-db';
import { logger } from '@/lib/logger';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canSync = await checkPermission('hr.leaves.sync');
  if (!canSync) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await pingDolibarrDb();
    if (!result.ok) {
      logger.warn({ result }, '[Dolibarr DB Ping] Failed');
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[Dolibarr DB Ping] Threw');
    if (error instanceof DolibarrDbNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const msg = error instanceof Error ? error.message : 'Ping failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
