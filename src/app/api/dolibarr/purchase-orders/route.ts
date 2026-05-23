import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const store = await cookies();
    const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
    const session = token ? verifySession(token) : null;
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const search = searchParams.get('search')?.trim() || '';
    const orderId = searchParams.get('orderId');

    const client = createDolibarrClient();

    // If orderId is provided, fetch single purchase order with full details
    if (orderId) {
      const order = await client.getPurchaseOrderById(orderId);
      if (!order) {
        return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
      }

      if (order.socid) {
        try {
          const supplier = await client.getThirdPartyById(order.socid);
          if (supplier) order.supplier_name = supplier.name;
        } catch { /* non-fatal */ }
      }

      if (order.fk_projet) {
        try {
          const project = await client.getProjectById(order.fk_projet);
          if (project) order.project_ref = project.ref;
        } catch { /* non-fatal */ }
      }

      // Linked invoices from local DB
      const poId = Number(order.id ?? orderId);
      type LinkedInvRow = { dolibarr_id: number; ref: string; ref_supplier: string | null; total_ttc: number; is_paid: number };
      const linked = await prisma.$queryRawUnsafe<LinkedInvRow[]>(
        `SELECT dolibarr_id, ref, ref_supplier, total_ttc, is_paid
         FROM fin_supplier_invoices
         WHERE linked_po_dolibarr_id = ? AND is_active = 1`,
        poId,
      );
      (order as Record<string, unknown>).linked_invoices = linked.map((r: LinkedInvRow) => ({
        ...r,
        dolibarr_id: Number(r.dolibarr_id),
        total_ttc: Number(r.total_ttc),
      }));

      return NextResponse.json({ order });
    }

    // Build sqlfilters for server-side search
    let sqlfilters: string | undefined;
    if (search) {
      const esc = search.replace(/'/g, "\\'");
      sqlfilters = `(t.ref:like:%${esc}%)`;
    }

    const orders = await client.getPurchaseOrders({
      page,
      limit,
      sortfield: 't.rowid',
      sortorder: 'DESC',
      sqlfilters,
    });

    // Enrich orders with supplier names and project references
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        if (order.socid) {
          try {
            const supplier = await client.getThirdPartyById(order.socid);
            if (supplier) order.supplier_name = supplier.name;
          } catch { /* non-fatal */ }
        }

        if (order.fk_projet) {
          try {
            const project = await client.getProjectById(order.fk_projet);
            if (project) order.project_ref = project.ref;
          } catch { /* non-fatal */ }
        }

        return order;
      })
    );

    // Batch-fetch linked invoices for all POs in one query
    const poIds = enrichedOrders.map(o => Number(o.id)).filter(id => !isNaN(id) && id > 0);
    const linkedInvoices = poIds.length > 0
      ? await prisma.$queryRawUnsafe<{ linked_po_dolibarr_id: number; dolibarr_id: number; ref: string; ref_supplier: string | null; total_ttc: number; is_paid: number }[]>(
          `SELECT linked_po_dolibarr_id, dolibarr_id, ref, ref_supplier, total_ttc, is_paid
           FROM fin_supplier_invoices
           WHERE linked_po_dolibarr_id IN (${poIds.map(() => '?').join(',')}) AND is_active = 1`,
          ...poIds,
        )
      : [];

    // Group linked invoices by PO ID
    const invoicesByPo = new Map<number, typeof linkedInvoices>();
    for (const inv of linkedInvoices) {
      const poId = Number(inv.linked_po_dolibarr_id);
      if (!invoicesByPo.has(poId)) invoicesByPo.set(poId, []);
      invoicesByPo.get(poId)!.push({
        ...inv,
        dolibarr_id: Number(inv.dolibarr_id),
        linked_po_dolibarr_id: poId,
        total_ttc: Number(inv.total_ttc),
      });
    }

    const result = enrichedOrders.map(o => ({
      ...o,
      linked_invoices: invoicesByPo.get(Number(o.id)) ?? [],
    }));

    const hasMore = orders.length >= limit;
    // Estimate total: if we got a full page, there are likely more
    const estimatedTotal = hasMore ? null : page * limit + orders.length;

    return NextResponse.json({
      orders: result,
      pagination: { page, limit, total: estimatedTotal, hasMore },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch purchase orders';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
