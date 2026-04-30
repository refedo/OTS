import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';

export const dynamic = 'force-dynamic';

interface LinkedInvoice {
  id: number;
  ref: string;
  refSupplier: string | null;
  dateInvoice: string | null;
  dateDue: string | null;
  totalHT: number;
  totalTTC: number;
  isPaid: boolean;
  totalPaid: number;
  balance: number;
}

type InvoicingStatus = 'no_invoice' | 'partial' | 'full' | 'over';

interface PORecord {
  id: number;
  ref: string;
  refSupplier: string | null;
  supplierId: number;
  supplierName: string;
  projectId: number | null;
  projectRef: string;
  projectTitle: string;
  status: string;
  totalHT: number;
  totalTTC: number;
  dateOrder: string | null;
  billed: boolean;
  note: string | null;
  invoices: LinkedInvoice[];
  invoiceTotalHT: number;
  invoiceTotalPaid: number;
  invoiceBalance: number;
  invoicingStatus: InvoicingStatus;
}

interface SupplierGroup {
  supplierId: number;
  supplierName: string;
  pos: PORecord[];
  poCount: number;
  noInvoiceCount: number;
  receivedNoInvoiceCount: number;
  poTotalHT: number;
  invoiceTotalHT: number;
}

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    // ── Fetch all Purchase Orders from Dolibarr ───────────────────────────
    let rawPOs: Array<{
      id: number;
      ref: string;
      refSupplier: string | null;
      socid: number;
      supplierNameFromApi: string | null;
      projectId: number | null;
      status: string;
      totalHT: number;
      totalTTC: number;
      dateOrder: string | null;
      billed: boolean;
      note: string | null;
    }> = [];

    try {
      const client = createDolibarrClient();
      const sqlFilterParts: string[] = [];
      if (from) sqlFilterParts.push(`(t.date_commande:>=:${Math.floor(new Date(from).getTime() / 1000)})`);
      if (to) sqlFilterParts.push(`(t.date_commande:<=:${Math.floor(new Date(to + 'T23:59:59').getTime() / 1000)})`);

      const orders = await client.getPurchaseOrders({
        sortfield: 't.date_commande',
        sortorder: 'DESC',
        limit: 500,
        sqlfilters: sqlFilterParts.length > 0 ? sqlFilterParts.join(' AND ') : undefined,
      });

      rawPOs = orders.map(o => ({
        id: Number(o.id),
        ref: o.ref,
        refSupplier: o.ref_supplier ?? null,
        socid: Number(o.socid),
        supplierNameFromApi: (o.supplier_name as string | null) ?? null,
        projectId: (o.fk_projet || o.fk_project) ? Number(o.fk_projet ?? o.fk_project) : null,
        status: String(o.statut ?? o.status ?? '0'),
        totalHT: Number(o.total_ht ?? 0),
        totalTTC: Number(o.total_ttc ?? 0),
        dateOrder: o.date_commande
          ? new Date(typeof o.date_commande === 'number' ? o.date_commande * 1000 : o.date_commande).toISOString().slice(0, 10)
          : null,
        billed: String(o.billed) === '1',
        note: o.note_public ?? null,
      }));
    } catch {
      return NextResponse.json({ error: 'Unable to reach Dolibarr — purchase orders unavailable' }, { status: 503 });
    }

    if (rawPOs.length === 0) {
      return NextResponse.json({
        groups: [],
        poCount: 0,
        invoiceCount: 0,
        stats: { totalPOs: 0, posWithInvoice: 0, posWithoutInvoice: 0, receivedWithoutInvoice: 0 },
      });
    }

    // ── Supplier names from DB ────────────────────────────────────────────
    const supplierIds = [...new Set(rawPOs.map(p => p.socid))];
    const supplierRows = (await prisma.$queryRawUnsafe(
      `SELECT dolibarr_id, name FROM dolibarr_thirdparties WHERE dolibarr_id IN (${supplierIds.map(() => '?').join(',')})`,
      ...supplierIds,
    )) as Array<{ dolibarr_id: number; name: string }>;
    const supplierNameMap = new Map<number, string>(supplierRows.map(s => [Number(s.dolibarr_id), s.name]));

    // ── Project refs from DB ──────────────────────────────────────────────
    const projectIds = [...new Set(rawPOs.map(p => p.projectId).filter((x): x is number => x !== null))];
    const projectMap = new Map<number, { ref: string; title: string }>();
    if (projectIds.length > 0) {
      const projectRows = (await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id, ref, title FROM dolibarr_projects WHERE dolibarr_id IN (${projectIds.map(() => '?').join(',')})`,
        ...projectIds,
      )) as Array<{ dolibarr_id: number; ref: string; title: string }>;
      for (const p of projectRows) projectMap.set(Number(p.dolibarr_id), { ref: p.ref, title: p.title });
    }

    // ── Supplier invoices for these suppliers ─────────────────────────────
    // linked_po_dolibarr_id may not exist yet (migration pending restart).
    // Derive it directly from dolibarr_raw JSON as a fallback so the report
    // works immediately, even before the column is created.
    type InvoiceRow = {
      dolibarr_id: number;
      ref: string;
      ref_supplier: string | null;
      socid: number;
      linked_po_dolibarr_id: number | null;
      total_ht: number;
      total_ttc: number;
      date_invoice: string | null;
      date_due: string | null;
      is_paid: number;
    };
    const invoiceRows = (await prisma.$queryRawUnsafe(
      `SELECT
         si.dolibarr_id,
         si.ref,
         si.ref_supplier,
         si.socid,
         CASE
           WHEN si.dolibarr_raw IS NOT NULL
             AND JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_type')) = 'order_supplier'
             AND CAST(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_id')), '0') AS UNSIGNED) > 0
           THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_id')) AS UNSIGNED)
           ELSE NULL
         END AS linked_po_dolibarr_id,
         si.total_ht,
         si.total_ttc,
         si.date_invoice,
         si.date_due,
         si.is_paid
       FROM fin_supplier_invoices si
       WHERE si.is_active = 1 AND si.status >= 1
         AND si.socid IN (${supplierIds.map(() => '?').join(',')})`,
      ...supplierIds,
    )) as InvoiceRow[];

    // ── Payments ──────────────────────────────────────────────────────────
    const invoiceIds = invoiceRows.map((r: InvoiceRow) => Number(r.dolibarr_id));
    const paidMap = new Map<number, number>();
    if (invoiceIds.length > 0) {
      const paymentRows = (await prisma.$queryRawUnsafe(
        `SELECT invoice_dolibarr_id, SUM(amount) AS total_paid
         FROM fin_payments
         WHERE payment_type = 'supplier'
           AND invoice_dolibarr_id IN (${invoiceIds.map(() => '?').join(',')})
         GROUP BY invoice_dolibarr_id`,
        ...invoiceIds,
      )) as Array<{ invoice_dolibarr_id: number; total_paid: number }>;
      for (const p of paymentRows) paidMap.set(Number(p.invoice_dolibarr_id), Number(p.total_paid));
    }

    // ── Match invoices → POs via linked_po_dolibarr_id ────────────────────
    const invoicesByPO = new Map<number, LinkedInvoice[]>();
    for (const inv of invoiceRows) {
      const linkedPoId = inv.linked_po_dolibarr_id ? Number(inv.linked_po_dolibarr_id) : null;
      if (!linkedPoId) continue;
      const paid = paidMap.get(Number(inv.dolibarr_id)) ?? 0;
      if (!invoicesByPO.has(linkedPoId)) invoicesByPO.set(linkedPoId, []);
      invoicesByPO.get(linkedPoId)!.push({
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
    }

    // ── Build typed PO records ────────────────────────────────────────────
    const poRecords: PORecord[] = rawPOs.map(po => {
      const supplierName = supplierNameMap.get(po.socid) ?? po.supplierNameFromApi ?? `Supplier #${po.socid}`;
      const project = po.projectId ? (projectMap.get(po.projectId) ?? { ref: '—', title: '' }) : { ref: '—', title: '' };
      const invoices = invoicesByPO.get(po.id) ?? [];
      const invoiceTotalHT = invoices.reduce((s, i) => s + i.totalHT, 0);
      const invoiceTotalPaid = invoices.reduce((s, i) => s + i.totalPaid, 0);
      const invoiceBalance = invoices.reduce((s, i) => s + i.balance, 0);

      let invoicingStatus: InvoicingStatus;
      if (invoices.length === 0) {
        invoicingStatus = 'no_invoice';
      } else if (invoiceTotalHT > po.totalHT + 0.01) {
        invoicingStatus = 'over';
      } else if (invoiceTotalHT >= po.totalHT - 0.01) {
        invoicingStatus = 'full';
      } else {
        invoicingStatus = 'partial';
      }

      return {
        id: po.id,
        ref: po.ref,
        refSupplier: po.refSupplier,
        supplierId: po.socid,
        supplierName,
        projectId: po.projectId,
        projectRef: project.ref,
        projectTitle: project.title,
        status: po.status,
        totalHT: po.totalHT,
        totalTTC: po.totalTTC,
        dateOrder: po.dateOrder,
        billed: po.billed,
        note: po.note,
        invoices,
        invoiceTotalHT,
        invoiceTotalPaid,
        invoiceBalance,
        invoicingStatus,
      };
    });

    // ── Group by supplier ─────────────────────────────────────────────────
    const supplierGroupMap = new Map<number, SupplierGroup>();
    for (const po of poRecords) {
      if (!supplierGroupMap.has(po.supplierId)) {
        supplierGroupMap.set(po.supplierId, {
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          pos: [],
          poCount: 0,
          noInvoiceCount: 0,
          receivedNoInvoiceCount: 0,
          poTotalHT: 0,
          invoiceTotalHT: 0,
        });
      }
      const g = supplierGroupMap.get(po.supplierId)!;
      g.pos.push(po);
      g.poCount++;
      g.poTotalHT += po.totalHT;
      g.invoiceTotalHT += po.invoiceTotalHT;
      if (po.invoicingStatus === 'no_invoice' && po.status !== '6' && po.status !== '7') {
        g.noInvoiceCount++;
        if (po.status === '4' || po.status === '5') g.receivedNoInvoiceCount++;
      }
    }

    // Sort: suppliers with received-no-invoice POs first, then by total PO value
    const groups = [...supplierGroupMap.values()].sort(
      (a, b) => b.receivedNoInvoiceCount - a.receivedNoInvoiceCount || b.noInvoiceCount - a.noInvoiceCount || b.poTotalHT - a.poTotalHT,
    );

    const stats = {
      totalPOs: poRecords.length,
      posWithInvoice: poRecords.filter(p => p.invoicingStatus !== 'no_invoice').length,
      posWithoutInvoice: poRecords.filter(p => p.invoicingStatus === 'no_invoice' && p.status !== '6' && p.status !== '7').length,
      receivedWithoutInvoice: poRecords.filter(p => p.invoicingStatus === 'no_invoice' && (p.status === '4' || p.status === '5')).length,
    };

    return NextResponse.json({ groups, poCount: rawPOs.length, invoiceCount: invoiceRows.length, stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
