import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';

export const dynamic = 'force-dynamic';

type InvoicingStatus = 'no_invoice' | 'partial' | 'full' | 'over';

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

function pi(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

function pf(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const client = createDolibarrClient();

    // ── Fetch POs and Invoices from Dolibarr concurrently ─────────────────
    const sqlFilterParts: string[] = [];
    if (from) sqlFilterParts.push(`(t.date_commande:>=:${Math.floor(new Date(from).getTime() / 1000)})`);
    if (to) sqlFilterParts.push(`(t.date_commande:<=:${Math.floor(new Date(to + 'T23:59:59').getTime() / 1000)})`);

    let rawOrders: Awaited<ReturnType<typeof client.getPurchaseOrders>>;
    let rawInvoices: Awaited<ReturnType<typeof client.getSupplierInvoices>>;
    try {
      [rawOrders, rawInvoices] = await Promise.all([
        client.getPurchaseOrders({
          sortfield: 't.date_commande',
          sortorder: 'DESC',
          limit: 500,
          sqlfilters: sqlFilterParts.length > 0 ? sqlFilterParts.join(' AND ') : undefined,
        }),
        // Fetch all supplier invoices — used to resolve PO↔Invoice linkage
        // using both origin_id (created-from-PO) and linked_objects.order_supplier
        // (manually linked). Limit 1000 covers most deployments; extend with
        // getAllSupplierInvoices if volumes grow.
        client.getSupplierInvoices({ limit: 1000, sortfield: 't.rowid', sortorder: 'DESC' }),
      ]);
    } catch {
      return NextResponse.json({ error: 'Unable to reach Dolibarr — check connection' }, { status: 503 });
    }

    if (rawOrders.length === 0) {
      return NextResponse.json({
        groups: [],
        poCount: 0,
        invoiceCount: 0,
        stats: { totalPOs: 0, posWithInvoice: 0, posWithoutInvoice: 0, receivedWithoutInvoice: 0 },
      });
    }

    // ── Supplier + project lookups ────────────────────────────────────────
    const supplierIds = [...new Set(rawOrders.map(o => pi(o.socid)))].filter(Boolean);
    const projectIds = [...new Set(rawOrders.map(o => {
      const p = o.fk_projet ?? o.fk_project;
      return p ? pi(p) : null;
    }).filter((x): x is number => x !== null && x > 0))];

    const [supplierRows, projectRows] = await Promise.all([
      supplierIds.length > 0
        ? (prisma.$queryRawUnsafe(
            `SELECT dolibarr_id, name FROM dolibarr_thirdparties WHERE dolibarr_id IN (${supplierIds.map(() => '?').join(',')})`,
            ...supplierIds,
          ) as Promise<Array<{ dolibarr_id: number; name: string }>>)
        : Promise.resolve([]),
      projectIds.length > 0
        ? (prisma.$queryRawUnsafe(
            `SELECT dolibarr_id, ref, title FROM dolibarr_projects WHERE dolibarr_id IN (${projectIds.map(() => '?').join(',')})`,
            ...projectIds,
          ) as Promise<Array<{ dolibarr_id: number; ref: string; title: string }>>)
        : Promise.resolve([]),
    ]);

    const supplierNameMap = new Map<number, string>((supplierRows as Array<{ dolibarr_id: number; name: string }>).map(s => [pi(s.dolibarr_id), s.name]));
    const projectMap = new Map<number, { ref: string; title: string }>();
    for (const p of (projectRows as Array<{ dolibarr_id: number; ref: string; title: string }>)) {
      projectMap.set(pi(p.dolibarr_id), { ref: p.ref, title: p.title });
    }

    // ── Build PO-ID → invoices map using Dolibarr linkage data ───────────
    // Two linkage strategies (mirrors the sync service logic):
    //   1. origin_type='order_supplier' + origin_id  →  invoice created from PO
    //   2. linked_objects.order_supplier              →  manually linked via Related Objects
    const invoicesByPO = new Map<number, { inv: typeof rawInvoices[0]; }[]>();
    const allDolibarrInvoiceIds: number[] = [];

    for (const inv of rawInvoices) {
      const invId = pi(inv.id);
      if (!invId) continue;
      allDolibarrInvoiceIds.push(invId);

      let linkedPoId: number | null = null;
      if (inv.origin_type === 'order_supplier' && pi(inv.origin_id) > 0) {
        linkedPoId = pi(inv.origin_id);
      } else if (inv.linked_objects?.order_supplier) {
        const keys = Object.keys(inv.linked_objects.order_supplier as Record<string, unknown>);
        if (keys.length > 0) linkedPoId = Number(keys[0]) || null;
      }

      if (linkedPoId) {
        if (!invoicesByPO.has(linkedPoId)) invoicesByPO.set(linkedPoId, []);
        invoicesByPO.get(linkedPoId)!.push({ inv });
      }
    }

    // ── Payment data from DB ──────────────────────────────────────────────
    const paidMap = new Map<number, number>();
    if (allDolibarrInvoiceIds.length > 0) {
      const paymentRows = (await prisma.$queryRawUnsafe(
        `SELECT invoice_dolibarr_id, SUM(amount) AS total_paid
         FROM fin_payments
         WHERE payment_type = 'supplier'
           AND invoice_dolibarr_id IN (${allDolibarrInvoiceIds.map(() => '?').join(',')})
         GROUP BY invoice_dolibarr_id`,
        ...allDolibarrInvoiceIds,
      )) as Array<{ invoice_dolibarr_id: number; total_paid: number }>;
      for (const p of paymentRows) paidMap.set(pi(p.invoice_dolibarr_id), pf(p.total_paid));
    }

    // ── Build typed PO records ────────────────────────────────────────────
    const poRecords: PORecord[] = rawOrders.map(o => {
      const socid = pi(o.socid);
      const projId = (o.fk_projet ?? o.fk_project) ? pi(o.fk_projet ?? o.fk_project) : null;
      const supplierName = supplierNameMap.get(socid) ?? (o.supplier_name as string | null) ?? `Supplier #${socid}`;
      const project = projId ? (projectMap.get(projId) ?? { ref: '—', title: '' }) : { ref: '—', title: '' };

      const linked = invoicesByPO.get(pi(o.id)) ?? [];
      const invoices: LinkedInvoice[] = linked.map(({ inv }) => {
        const invId = pi(inv.id);
        const ttc = pf(inv.total_ttc);
        const paid = paidMap.get(invId) ?? 0;
        // Parse date from unix timestamp or date string
        const toDateStr = (v: number | string | null | undefined) => {
          if (!v) return null;
          const ts = typeof v === 'number' ? v : parseInt(String(v), 10);
          if (!isNaN(ts) && ts > 0) return new Date(ts * 1000).toISOString().slice(0, 10);
          const d = new Date(String(v));
          return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        };
        return {
          id: invId,
          ref: inv.ref,
          refSupplier: (inv.ref_supplier as string | null) ?? null,
          dateInvoice: toDateStr(inv.date_validation ?? inv.date),
          dateDue: toDateStr(inv.date_echeance),
          totalHT: pf(inv.total_ht),
          totalTTC: ttc,
          isPaid: inv.paye === '1' || inv.paid === '1',
          totalPaid: paid,
          balance: ttc - paid,
        };
      });

      const invoiceTotalHT = invoices.reduce((s, i) => s + i.totalHT, 0);
      const invoiceTotalPaid = invoices.reduce((s, i) => s + i.totalPaid, 0);
      const invoiceBalance = invoices.reduce((s, i) => s + i.balance, 0);

      let invoicingStatus: InvoicingStatus;
      const poHT = pf(o.total_ht);
      if (invoices.length === 0) {
        invoicingStatus = 'no_invoice';
      } else if (invoiceTotalHT > poHT + 0.01) {
        invoicingStatus = 'over';
      } else if (invoiceTotalHT >= poHT - 0.01) {
        invoicingStatus = 'full';
      } else {
        invoicingStatus = 'partial';
      }

      const toDateStr2 = (v: number | string | null | undefined) => {
        if (!v) return null;
        const ts = typeof v === 'number' ? v : parseInt(String(v), 10);
        if (!isNaN(ts) && ts > 0) return new Date(ts * 1000).toISOString().slice(0, 10);
        return null;
      };

      return {
        id: pi(o.id),
        ref: o.ref,
        refSupplier: (o.ref_supplier as string | null) ?? null,
        supplierId: socid,
        supplierName,
        projectId: projId,
        projectRef: project.ref,
        projectTitle: project.title,
        status: String(o.statut ?? o.status ?? '0'),
        totalHT: pf(o.total_ht),
        totalTTC: pf(o.total_ttc),
        dateOrder: toDateStr2(o.date_commande),
        billed: String(o.billed) === '1',
        note: (o.note_public as string | null) ?? null,
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

    const groups = [...supplierGroupMap.values()].sort(
      (a, b) => b.receivedNoInvoiceCount - a.receivedNoInvoiceCount || b.noInvoiceCount - a.noInvoiceCount || b.poTotalHT - a.poTotalHT,
    );

    const stats = {
      totalPOs: poRecords.length,
      posWithInvoice: poRecords.filter(p => p.invoicingStatus !== 'no_invoice').length,
      posWithoutInvoice: poRecords.filter(p => p.invoicingStatus === 'no_invoice' && p.status !== '6' && p.status !== '7').length,
      receivedWithoutInvoice: poRecords.filter(p => p.invoicingStatus === 'no_invoice' && (p.status === '4' || p.status === '5')).length,
    };

    return NextResponse.json({
      groups,
      poCount: rawOrders.length,
      invoiceCount: rawInvoices.length,
      stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
