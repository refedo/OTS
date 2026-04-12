/**
 * PUT /api/admin/identity-reconciliation/[userId]
 *
 * Sets (or clears) the Dolibarr user link for a single OTS user. Writes
 * dolibarrUserId, reconciledAt, reconciledById. Returns 409 if a different
 * OTS user has already claimed that dolibarrUserId.
 *
 * Body: { dolibarrUserId: number | null }
 *
 * Gated by `admin.identity.reconcile` (CEO-only by default).
 *
 * IMPORTANT: once `SystemConfig.identityReconciliationComplete === "true"`,
 * this endpoint becomes read-only (HTTP 409) — the wizard is a one-time
 * flow. Changing a link after that requires flipping the flag back to
 * "false" via direct DB intervention, which is deliberate friction.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

const updateSchema = z.object({
  dolibarrUserId: z.number().int().nullable(),
});

export async function PUT(req: Request, context: { params: Promise<{ userId: string }> }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await checkPermission('admin.identity.reconcile'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Lock writes once the wizard has been completed
  const gate = await prisma.systemConfig.findUnique({
    where: { key: 'identityReconciliationComplete' },
  });
  if (gate?.value === 'true') {
    return NextResponse.json(
      {
        error: 'Reconciliation has already been completed and is now read-only',
        code: 'RECONCILIATION_LOCKED',
      },
      { status: 409 },
    );
  }

  const { userId } = await context.params;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { dolibarrUserId } = parsed.data;

  // Conflict check: a different OTS user already claimed this dolibarrUserId
  if (dolibarrUserId != null) {
    const collision = await prisma.user.findFirst({
      where: { dolibarrUserId, NOT: { id: userId } },
      select: { id: true, name: true, email: true },
    });
    if (collision) {
      return NextResponse.json(
        {
          error: `Dolibarr user ID ${dolibarrUserId} is already linked to ${collision.name} (${collision.email})`,
          code: 'DUPLICATE_DOLIBARR_USER',
          conflictingUser: collision,
        },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      dolibarrUserId,
      reconciledAt: dolibarrUserId != null ? new Date() : null,
      reconciledById: dolibarrUserId != null ? session.sub : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      dolibarrUserId: true,
      reconciledAt: true,
      reconciledById: true,
      employeeId: true,
    },
  });

  logger.info(
    { userId, dolibarrUserId, performedById: session.sub },
    '[Identity Reconciliation] User link updated',
  );

  return NextResponse.json(updated);
}
