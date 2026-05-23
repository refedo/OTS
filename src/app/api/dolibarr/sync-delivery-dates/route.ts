/**
 * POST /api/dolibarr/sync-delivery-dates
 *
 * Syncs planned delivery dates from Dolibarr P.O's to linked MIRs.
 * For each MIR that has a dolibarrPoId, fetches the current PO from Dolibarr
 * and updates plannedDeliveryDate if it differs.
 */

import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';
import { logger } from '@/lib/logger';

export const POST = withApiContext(async (_req: NextRequest) => {
  const permissions = await getCurrentUserPermissions();
  // Allow anyone with dolibarr view permissions or admin
  const canSync = permissions.some(p =>
    ['dolibarr.sync', 'dolibarr.view', 'admin.identity.reconcile'].includes(p)
  );

  if (!canSync) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = createDolibarrClient();

  // Fetch all MIRs that have a linked Dolibarr PO (dolibarrPoId is non-nullable String, filter empty values)
  const mirs = await prisma.materialInspectionReceipt.findMany({
    where: {
      dolibarrPoId: { not: '' },
    },
    select: {
      id: true,
      dolibarrPoId: true,
      plannedDeliveryDate: true,
    },
  });

  let updated = 0;
  let errors = 0;

  for (const mir of mirs) {
    if (!mir.dolibarrPoId) continue;
    try {
      const po = await client.getPurchaseOrderById(String(mir.dolibarrPoId));
      if (!po || !po.date_livraison) continue;

      const newDeliveryDate = new Date(Number(po.date_livraison) * 1000);
      const existingDate = mir.plannedDeliveryDate ? new Date(mir.plannedDeliveryDate) : null;

      // Only update if date actually changed (compare day-level)
      const newDay = newDeliveryDate.toISOString().split('T')[0];
      const existingDay = existingDate ? existingDate.toISOString().split('T')[0] : null;

      if (newDay !== existingDay) {
        await prisma.materialInspectionReceipt.update({
          where: { id: mir.id },
          data: { plannedDeliveryDate: newDeliveryDate },
        });
        updated++;
        logger.info(
          { mirId: mir.id, dolibarrPoId: mir.dolibarrPoId, newDeliveryDate },
          'MIR planned delivery date synced from Dolibarr'
        );
      }
    } catch (err) {
      errors++;
      logger.warn(
        { err, mirId: mir.id, dolibarrPoId: mir.dolibarrPoId },
        'Failed to sync delivery date for MIR'
      );
    }
  }

  return NextResponse.json({ updated, errors, total: mirs.length });
});
