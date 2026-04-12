/**
 * POST /api/admin/identity-reconciliation/complete
 *
 * Flips `SystemConfig.identityReconciliationComplete` to "true", unlocking
 * the Dolibarr employee sync. Only succeeds if every active OTS user has a
 * non-null `dolibarrUserId` — otherwise returns 400 with the list of
 * un-reconciled users. Idempotent: safe to call when already complete.
 *
 * Gated by `admin.identity.reconcile` (CEO-only by default).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

export async function POST() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await checkPermission('admin.identity.reconcile'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const unreconciled = await prisma.user.findMany({
    where: { status: 'active', dolibarrUserId: null },
    select: { id: true, name: true, email: true },
  });

  if (unreconciled.length > 0) {
    return NextResponse.json(
      {
        error: 'Cannot complete reconciliation — some users are still unlinked',
        code: 'INCOMPLETE_LINKS',
        unreconciled,
      },
      { status: 400 },
    );
  }

  await prisma.systemConfig.upsert({
    where: { key: 'identityReconciliationComplete' },
    create: {
      key: 'identityReconciliationComplete',
      value: 'true',
      description:
        'Gate flag for the Dolibarr employee sync. Set to "true" once all OTS Users have been linked to their Dolibarr llx_user counterparts via the identity reconciliation wizard.',
      updatedById: session.sub,
    },
    update: { value: 'true', updatedById: session.sub },
  });

  logger.info(
    { performedById: session.sub },
    '[Identity Reconciliation] Wizard completed — Dolibarr employee sync is now unlocked',
  );

  return NextResponse.json({ success: true, isComplete: true });
}
