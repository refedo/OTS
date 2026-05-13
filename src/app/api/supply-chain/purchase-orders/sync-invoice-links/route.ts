import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const POST = withApiContext(async (_req, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = createDolibarrClient();
    let updated = 0;
    let page = 0;
    const batchSize = 200;
    let hasMore = true;

    while (hasMore) {
      const invoices = await client.getSupplierInvoices({ limit: batchSize, page, sortfield: 't.rowid', sortorder: 'ASC' });
      if (!invoices.length) break;
      hasMore = invoices.length >= batchSize;

      for (const inv of invoices) {
        const invId = Number(inv.id);
        if (!invId) continue;

        let poId: number | null = null;

        // Strategy A: origin-based link
        if ((inv as Record<string, unknown>).origin_type === 'order_supplier') {
          const originId = Number((inv as Record<string, unknown>).origin_id);
          if (originId > 0) poId = originId;
        }

        // Strategy B: fetch full record and check linked_objects
        if (!poId) {
          try {
            const full = await client.getSupplierInvoiceById(invId);
            if (full) {
              const linked = (full as Record<string, unknown>).linked_objects as Record<string, unknown> | undefined;
              if (linked) {
                const orderSupplier = linked['order_supplier'] as Record<string, unknown> | undefined;
                if (orderSupplier) {
                  const firstId = Object.keys(orderSupplier)[0];
                  if (firstId) poId = Number(firstId);
                }
              }
            }
          } catch { /* non-fatal */ }
        }

        if (poId && poId > 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE fin_supplier_invoices SET linked_po_dolibarr_id = ? WHERE dolibarr_id = ? AND (linked_po_dolibarr_id IS NULL OR linked_po_dolibarr_id != ?)`,
            poId, invId, poId,
          );
          updated++;
        }
      }

      page++;
    }

    logger.info({ updated, userId: session.userId }, '[PO] Synced invoice links');
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    logger.error({ error }, '[PO] Failed to sync invoice links');
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
});
