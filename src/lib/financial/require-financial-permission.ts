import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SessionPayload } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

/**
 * Server-side guard for financial API routes.
 * Returns the session if the user has financial.view (or financial.manage for write ops).
 * Returns a NextResponse error (401 or 403) if not authorized.
 */
export async function requireFinancialPermission(
  permission: 'financial.view' | 'financial.manage' | 'financial.sync' | 'financial.export' = 'financial.view'
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const hasAccess = await checkPermission(permission);
  if (!hasAccess) {
    return { error: NextResponse.json({ error: 'Access denied. You do not have financial report permissions.' }, { status: 403 }) };
  }

  return { session };
}
