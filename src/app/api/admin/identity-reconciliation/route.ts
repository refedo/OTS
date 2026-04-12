/**
 * GET /api/admin/identity-reconciliation
 *
 * Lists all OTS users plus their identity-reconciliation link state and a
 * progress summary. Used by the one-time wizard UI to render the table and
 * decide whether the "Complete reconciliation" button can be enabled.
 *
 * Gated by `admin.identity.reconcile` (CEO-only by default).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

export async function GET() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await checkPermission('admin.identity.reconcile'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      dolibarrUserId: true,
      employeeId: true,
      reconciledAt: true,
      reconciledById: true,
      role: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const total = users.length;
  const linked = users.filter((u) => u.dolibarrUserId != null).length;

  const gate = await prisma.systemConfig.findUnique({
    where: { key: 'identityReconciliationComplete' },
  });

  return NextResponse.json({
    users,
    progress: { total, linked, remaining: total - linked },
    isComplete: gate?.value === 'true',
  });
}
