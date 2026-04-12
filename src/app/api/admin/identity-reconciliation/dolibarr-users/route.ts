/**
 * GET /api/admin/identity-reconciliation/dolibarr-users
 *
 * Live proxy to the Dolibarr API to fetch the full user list for the
 * reconciliation wizard dropdown. Returns a trimmed projection — just
 * what the dropdown needs: id, name, email, job, login.
 *
 * Gated by `admin.identity.reconcile` (CEO-only by default).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';
import { logger } from '@/lib/logger';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await checkPermission('admin.identity.reconcile'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = createDolibarrClient();
    const users = await client.getAllUsers();
    const projected = users.map((u) => ({
      id: typeof u.id === 'number' ? u.id : parseInt(String(u.id), 10),
      firstname: u.firstname ?? null,
      lastname: u.lastname ?? null,
      login: u.login ?? null,
      email: u.email ?? null,
      job: u.job ?? null,
      fullName:
        [u.firstname, u.lastname]
          .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
          .join(' ') || u.login || `User #${u.id}`,
    }));
    return NextResponse.json(projected);
  } catch (error) {
    logger.error({ error }, '[Identity Reconciliation] Failed to fetch Dolibarr users');
    const msg = error instanceof Error ? error.message : 'Failed to fetch Dolibarr users';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
