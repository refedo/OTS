/**
 * POST /api/hr/manpower-invoices/[id]/confirm
 * Moves a DRAFT invoice to CONFIRMED — HR sign-off before Dolibarr push.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { checkPermission } from '@/lib/permission-checker';

export const POST = withApiContext(async (_req: NextRequest, session, ctx) => {
  const canManage = await checkPermission('hr.billing.manage');
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = ctx?.params?.id as string;
  const draft = await prisma.manpowerInvoiceDraft.findUnique({
    where: { id },
    select: { id: true, status: true, deletedAt: true },
  });

  if (!draft || draft.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (draft.status !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot confirm a ${draft.status} invoice` }, { status: 400 });
  }

  const updated = await prisma.manpowerInvoiceDraft.update({
    where: { id },
    data: { status: 'CONFIRMED', updatedById: session!.userId },
  });

  logger.info({ id, confirmedById: session!.userId }, '[ManpowerBilling] Draft confirmed');
  return NextResponse.json(updated);
});
