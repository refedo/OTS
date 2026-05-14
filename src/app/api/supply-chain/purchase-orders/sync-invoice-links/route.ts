import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Dolibarr uses these key names for linked supplier invoices on the order side
const SUPPLIER_INVOICE_KEYS = ['facture_fournisseur', 'invoice_supplier', 'facture'];
// Keys used on the invoice side to reference the originating order
const SUPPLIER_ORDER_KEYS   = ['order_supplier', 'commande_fournisseur', 'fourn_commande'];

function extractLinkedIds(linked: Record<string, unknown>, keys: string[]): number[] {
  for (const key of keys) {
    const obj = linked[key] as Record<string, unknown> | undefined;
    if (obj && typeof obj === 'object') {
      const ids = Object.keys(obj).map(Number).filter(n => n > 0);
      if (ids.length) return ids;
    }
  }
  return [];
}

async function updateInvoicePoLink(invId: number, poId: number): Promise<boolean> {
  const res = await prisma.$executeRawUnsafe(
    `UPDATE fin_supplier_invoices SET linked_po_dolibarr_id = ?
     WHERE dolibarr_id = ? AND (linked_po_dolibarr_id IS NULL OR linked_po_dolibarr_id != ?)`,
    poId, invId, poId,
  );
  return Number(res) > 0;
}

export const POST = withApiContext(async (_req, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = createDolibarrClient();
    let updated = 0;

    // ── Strategy 1: iterate all supplier invoices ──────────────────────────
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

        // A: origin-based (invoice created from a PO)
        const raw = inv as Record<string, unknown>;
        if (raw.origin_type === 'order_supplier' || raw.origin_type === 'commande_fournisseur') {
          const originId = Number(raw.origin_id);
          if (originId > 0) poId = originId;
        }

        // B: linked_objects on the list response
        if (!poId) {
          const linked = raw.linked_objects as Record<string, unknown> | undefined;
          if (linked) {
            const ids = extractLinkedIds(linked, SUPPLIER_ORDER_KEYS);
            if (ids.length) poId = ids[0];
          }
        }

        // C: fetch full invoice record for linked_objects
        if (!poId) {
          try {
            const full = await client.getSupplierInvoiceById(invId);
            if (full) {
              const linked = (full as Record<string, unknown>).linked_objects as Record<string, unknown> | undefined;
              if (linked) {
                const ids = extractLinkedIds(linked, SUPPLIER_ORDER_KEYS);
                if (ids.length) poId = ids[0];
              }
            }
          } catch { /* non-fatal */ }
        }

        if (poId && poId > 0) {
          if (await updateInvoicePoLink(invId, poId)) updated++;
        }
      }

      page++;
    }

    // ── Strategy 2: iterate POs and push links to invoices ─────────────────
    page = 0;
    hasMore = true;

    while (hasMore) {
      const orders = await client.getPurchaseOrders({ limit: batchSize, page, sortfield: 't.rowid', sortorder: 'ASC' });
      if (!orders.length) break;
      hasMore = orders.length >= batchSize;

      for (const order of orders) {
        const poId = Number(order.id);
        if (!poId) continue;

        // Try linked_objects on list response first; if empty, fetch full PO
        let invIds: number[] = [];
        const rawOrder = order as Record<string, unknown>;
        const listedLinked = rawOrder.linked_objects as Record<string, unknown> | undefined;
        if (listedLinked) {
          invIds = extractLinkedIds(listedLinked, SUPPLIER_INVOICE_KEYS);
        }

        if (!invIds.length) {
          try {
            const fullPo = await client.getPurchaseOrderById(poId);
            if (fullPo) {
              const linked = (fullPo as Record<string, unknown>).linked_objects as Record<string, unknown> | undefined;
              if (linked) invIds = extractLinkedIds(linked, SUPPLIER_INVOICE_KEYS);
            }
          } catch { /* non-fatal */ }
        }

        for (const invId of invIds) {
          if (await updateInvoicePoLink(invId, poId)) updated++;
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
