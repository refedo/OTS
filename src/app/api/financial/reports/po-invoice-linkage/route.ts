import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const supplierIdParam = searchParams.get('supplierId');
  const projectIdParam = searchParams.get('projectId');
  const from = searchParams.get('from') || '2000-01-01';
  const to = searchParams.get('to') || '2099-12-31';

  try {
    // ── Fetch supplier invoices from local DB ──────────────────────────────
    const conditions: string[] = [
      'si.is_active = 1',
      'si.status >= 1',
      `si.date_invoice BETWEEN '${from}' AND '${to}'`,
    ];
    if (supplierIdParam) conditions.push(`si.socid = ${parseInt(supplierIdParam, 10)}`);
    if (projectIdParam) conditions.push(`si.fk_projet = ${parseInt(projectIdParam, 10)}`);

    const invoiceRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.dolibarr_id,
        si.ref,
        si.ref_supplier,
        si.socid,
        si.fk_projet,
        si.total_ht,
        si.total_tva,
        si.total_ttc,
        si.date_invoice,
        si.date_due,
        si.is_paid,
        si.status,
        COALESCE(dt.name, CONCAT('Supplier #', si.socid)) AS supplier_name,
        COALESCE(dp.ref, '') AS project_ref,
        COALESCE(dp.title, '') AS project_title
      FROM fin_supplier_invoices si
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      LEFT JOIN dolibarr_projects dp ON dp.dolibarr_id = si.fk_projet
      WHERE ${conditions.join(' AND ')}
      ORDER BY si.date_invoice DESC
      LIMIT 500
    `);

    // ── Payments for invoices ──────────────────────────────────────────────
    const invoiceIds = invoiceRows.map((r: any) => Number(r.dolibarr_id));
    let paymentRows: any[] = [];
    if (invoiceIds.length > 0) {
      paymentRows = await prisma.$queryRawUnsafe(`
        SELECT invoice_dolibarr_id, SUM(amount) AS total_paid
        FROM fin_payments
        WHERE payment_type = 'supplier'
          AND invoice_dolibarr_id IN (${invoiceIds.map(() => '?').join(',')})
        GROUP BY invoice_dolibarr_id
      `, ...invoiceIds);
    }
    const paidMap = new Map<number, number>();
    for (const p of paymentRows) paidMap.set(Number(p.invoice_dolibarr_id), Number(p.total_paid));

    // ── Fetch Purchase Orders from Dolibarr ───────────────────────────────
    let allPOs: any[] = [];
    try {
      const client = createDolibarrClient();
      const poParams: Record<string, string | number> = {
        sortfield: 't.date_commande',
        sortorder: 'DESC',
        limit: 500,
      };
      if (supplierIdParam) poParams['sqlfilters'] = `(t.fk_soc:=:${parseInt(supplierIdParam, 10)})`;
      const orders = await client.getPurchaseOrders(poParams);
      allPOs = orders.map((o: any) => ({
        id: Number(o.id),
        ref: o.ref,
        refSupplier: o.ref_supplier ?? null,
        socid: Number(o.socid),
        projectId: o.fk_projet ? Number(o.fk_projet) : null,
        status: String(o.statut ?? o.status ?? '0'),
        totalHT: Number(o.total_ht ?? 0),
        totalTTC: Number(o.total_ttc ?? 0),
        dateOrder: o.date_commande
          ? new Date(typeof o.date_commande === 'number' ? o.date_commande * 1000 : o.date_commande).toISOString().slice(0, 10)
          : null,
        dateCreation: o.date_creation
          ? new Date(typeof o.date_creation === 'number' ? o.date_creation * 1000 : o.date_creation).toISOString().slice(0, 10)
          : null,
        billed: o.billed === '1' || o.billed === 1,
        note: o.note_public ?? null,
      }));
    } catch {
      // Dolibarr unavailable — continue with invoices only
    }

    // ── Group by supplier + project ────────────────────────────────────────
    type GroupKey = string;
    interface Group {
      supplierName: string;
      supplierId: number;
      projectRef: string;
      projectTitle: string;
      projectId: number | null;
      purchaseOrders: typeof allPOs;
      invoices: any[];
      poTotalHT: number;
      invTotalHT: number;
      totalPaid: number;
      variance: number;
    }
    const groups = new Map<GroupKey, Group>();

    // Add invoice groups
    for (const inv of invoiceRows) {
      const sid = Number(inv.socid);
      const pid = Number(inv.fk_projet) || 0;
      const key = `${sid}__${pid}`;
      if (!groups.has(key)) {
        groups.set(key, {
          supplierName: inv.supplier_name,
          supplierId: sid,
          projectRef: inv.project_ref || '—',
          projectTitle: inv.project_title || '',
          projectId: pid || null,
          purchaseOrders: [],
          invoices: [],
          poTotalHT: 0,
          invTotalHT: 0,
          totalPaid: 0,
          variance: 0,
        });
      }
      const g = groups.get(key)!;
      const paid = paidMap.get(Number(inv.dolibarr_id)) ?? 0;
      g.invoices.push({
        id: Number(inv.dolibarr_id),
        ref: inv.ref,
        refSupplier: inv.ref_supplier,
        dateInvoice: inv.date_invoice ? new Date(inv.date_invoice).toISOString().slice(0, 10) : null,
        dateDue: inv.date_due ? new Date(inv.date_due).toISOString().slice(0, 10) : null,
        totalHT: Number(inv.total_ht),
        totalTTC: Number(inv.total_ttc),
        isPaid: inv.is_paid === 1,
        totalPaid: paid,
        balance: Number(inv.total_ttc) - paid,
      });
      g.invTotalHT += Number(inv.total_ht);
      g.totalPaid += paid;
    }

    // Add PO groups
    for (const po of allPOs) {
      const sid = po.socid;
      const pid = po.projectId ?? 0;
      const key = `${sid}__${pid}`;
      if (!groups.has(key)) {
        // Only add PO-only groups if they match filter
        if (supplierIdParam && sid !== parseInt(supplierIdParam, 10)) continue;
        if (projectIdParam && (po.projectId ?? 0) !== parseInt(projectIdParam, 10)) continue;
        groups.set(key, {
          supplierName: po.supplierName ?? `Supplier #${sid}`,
          supplierId: sid,
          projectRef: po.projectRef ?? '—',
          projectTitle: po.projectTitle ?? '',
          projectId: po.projectId,
          purchaseOrders: [],
          invoices: [],
          poTotalHT: 0,
          invTotalHT: 0,
          totalPaid: 0,
          variance: 0,
        });
      }
      const g = groups.get(key)!;
      if (!g.purchaseOrders.find((p: any) => p.id === po.id)) {
        g.purchaseOrders.push(po);
        g.poTotalHT += po.totalHT;
      }
    }

    // Match POs to their groups (already grouped by supplier+project)
    for (const po of allPOs) {
      const sid = po.socid;
      const pid = po.projectId ?? 0;
      const key = `${sid}__${pid}`;
      const g = groups.get(key);
      if (g && !g.purchaseOrders.find((p: any) => p.id === po.id)) {
        g.purchaseOrders.push(po);
        g.poTotalHT += po.totalHT;
      }
    }

    // Compute variance
    for (const g of groups.values()) {
      g.variance = g.invTotalHT - g.poTotalHT;
      g.purchaseOrders.sort((a: any, b: any) => (a.dateOrder ?? '').localeCompare(b.dateOrder ?? ''));
    }

    const result = [...groups.values()].sort((a, b) => b.invTotalHT - a.invTotalHT);

    return NextResponse.json({ groups: result, invoiceCount: invoiceRows.length, poCount: allPOs.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
