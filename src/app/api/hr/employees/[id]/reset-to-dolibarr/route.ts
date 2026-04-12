/**
 * POST /api/hr/employees/[id]/reset-to-dolibarr
 *
 * Clears the `manuallyEditedFields` skip-list on an employee, so the next
 * Dolibarr sync overwrites every field from upstream. Gated by
 * `hr.employee.resetToDolibarr` — CEO-only by default (HR role does not
 * have this permission by default). This is a one-click undo of the
 * preserve-on-edit policy for a single employee row, intended for the
 * rare case that an OTS edit was wrong and Walid wants to forcibly
 * re-align the row with Dolibarr.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canReset = await checkPermission('hr.employee.resetToDolibarr');
  if (!canReset) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const existing = await prisma.employee.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const previousEdits = Array.isArray(existing.manuallyEditedFields)
    ? (existing.manuallyEditedFields as string[])
    : [];

  await prisma.employee.update({
    where: { id },
    data: {
      manuallyEditedFields: [],
      updatedById: session.sub,
    },
  });

  logger.info(
    {
      employeeId: id,
      previousEdits,
      performedById: session.sub,
    },
    '[HR] Employee manuallyEditedFields cleared — will re-sync from Dolibarr on next run',
  );

  return NextResponse.json({
    success: true,
    clearedFields: previousEdits,
    message:
      'Employee has been reset. The next Dolibarr sync will overwrite all fields from upstream.',
  });
}
