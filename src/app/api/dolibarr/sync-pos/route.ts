/**
 * POST /api/dolibarr/sync-pos
 *
 * Syncs Purchase Order data from Dolibarr:
 * - For each MIR that has a dolibarrPoId, fetches the current PO detail from
 *   Dolibarr (detail endpoint returns real date_livraison; list endpoint returns 0)
 *   and updates plannedDeliveryDate if it differs.
 * - Logs the result to dolibarr_sync_log (entity_type = 'purchaseorders').
 * - Stores last_po_sync timestamp in dolibarr_integration_config.
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
  const canSync = permissions.some(p =>
    ['dolibarr.sync', 'dolibarr.view', 'admin.identity.reconcile'].includes(p)
  );

  if (!canSync) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const startTime = Date.now();
  const client = createDolibarrClient();

  // Fetch all MIRs that have a linked Dolibarr PO
  const mirs = await prisma.materialInspectionReceipt.findMany({
    where: { dolibarrPoId: { not: '' } },
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
      // Use detail endpoint — list endpoint always returns date_livraison: 0
      const po = await client.getPurchaseOrderById(String(mir.dolibarrPoId));
      if (!po) continue;

      // Dolibarr returns 0 (number or string) when the delivery date is not set
      const tsNum = Number(po.date_livraison);
      if (!tsNum || tsNum <= 0) continue;

      const newDeliveryDate = new Date(tsNum * 1000);
      const existingDate = mir.plannedDeliveryDate ? new Date(mir.plannedDeliveryDate) : null;

      // Compare at day level to avoid spurious updates from time-of-day differences
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
          'MIR planned delivery date synced from Dolibarr PO sync'
        );
      }
    } catch (err) {
      errors++;
      logger.warn(
        { err, mirId: mir.id, dolibarrPoId: mir.dolibarrPoId },
        'Failed to sync delivery date for MIR during PO sync'
      );
    }
  }

  const durationMs = Date.now() - startTime;
  const now = new Date().toISOString();
  const syncStatus =
    errors === 0 ? 'success' : updated > 0 ? 'partial' : 'error';

  // Log to dolibarr_sync_log so it appears in the Sync History table
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO dolibarr_sync_log (
         entity_type, status, records_created, records_updated,
         records_unchanged, records_deactivated, total_records,
         duration_ms, error_message, triggered_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'purchaseorders',
      syncStatus,
      0,
      updated,
      mirs.length - updated - errors,
      0,
      mirs.length,
      durationMs,
      errors > 0 ? `${errors} MIR(s) failed` : null,
      'manual',
    );
  } catch (logErr) {
    logger.warn({ logErr }, 'Failed to log PO sync to dolibarr_sync_log');
  }

  // Persist last sync time so the overview card shows a real timestamp
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO dolibarr_integration_config (config_key, config_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE config_value = ?, updated_at = NOW()`,
      'last_po_sync',
      now,
      now,
    );
  } catch (configErr) {
    logger.warn({ configErr }, 'Failed to save last_po_sync to dolibarr_integration_config');
  }

  return NextResponse.json({ updated, errors, total: mirs.length });
});
