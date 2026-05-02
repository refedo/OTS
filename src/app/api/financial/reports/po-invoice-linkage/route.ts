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

interface InvoiceDbRow {
  dolibarr_id: number;
  ref: string;
  ref_supplier: string | null;
  total_ht: number;
  total_ttc: number;
  date_invoice: string | null;
  date_due: string | null;
  is_paid: number;
  origin_po_id: number | null;
}

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  try {
    const client = createDolibarrClient();

    // ── Fetch POs from Dolibarr ───────────────────────────────────────────
    const sqlFilterParts: string[] = [];
    if (from) sqlFilterParts.push(`(t.date_commande:>=:${Math.floor(new Date(from).getTime() / 1000)})`);
    if (to) sqlFilterParts.push(`(t.date_commande:<=:${Math.floor(new Date(to + 'T23:59:59').getTime() / 1000)})`);

    // Step 1 — list fetch (fast, no linked_objects)
    let listOrders: Awaited<ReturnType<typeof client.getPurchaseOrders>>;
    try {
      listOrders = await client.getPurchaseOrders({
        sortfield: 't.date_commande',
        sortorder: 'DESC',
        limit: 500,
        sqlfilters: sqlFilterParts.length > 0 ? sqlFilterParts.join(' AND ') : undefined,
      });
    } catch {
      return NextResponse.json({ error: 'Unable to reach Dolibarr — check connection' }, { status: 503 });
    }

    if (listOrders.length === 0) {
      return NextResponse.json({
        groups: [],
        poCount: 0,
        invoiceCount: 0,
        stats: { totalPOs: 0, posWithInvoice: 0, posWithoutInvoice: 0, receivedWithoutInvoice: 0 },
      });
    }

    // Step 2 — individual PO fetches in parallel batches to get linked_objects.facture_fourn.
    // The list API (/supplierorders) does NOT return linked_objects; only GET /supplierorders/{id} does.
    // Batches of 20 keep Dolibarr load reasonable while completing in a few seconds.
    const BATCH = 20;
    const rawOrders = [...listOrders];
    for (let i = 0; i < listOrders.length; i += BATCH) {
      const slice = listOrders.slice(i, i + BATCH);
      const details = await Promise.allSettled(
        slice.map(po => client.getPurchaseOrderById(pi(po.id))),
      );
      details.forEach((result, j) => {
        if (result.status === 'fulfilled' && result.value) {
          rawOrders[i + j] = result.value;
        }
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

    const supplierNameMap = new Map<number, string>(
      (supplierRows as Array<{ dolibarr_id: number; name: string }>).map(s => [pi(s.dolibarr_id), s.name]),
    );
    const projectMap = new Map<number, { ref: string; title: string }>();
    for (const p of (projectRows as Array<{ dolibarr_id: number; ref: string; title: string }>)) {
      projectMap.set(pi(p.dolibarr_id), { ref: p.ref, title: p.title });
    }

    // ── Strategy A: extract linked invoice IDs from PO's linked_objects ──
    // The Dolibarr /supplierorders list API includes linked_objects with
    // 'facture_fourn' keys pointing to linked supplier invoice Dolibarr IDs.
    // This is the primary linkage method for manually-linked invoices.
    const poToInvoiceIds = new Map<number, Set<number>>();
    const linkedInvoiceIds = new Set<number>();
    const allPoDolibarrIds: number[] = rawOrders.map(o => pi(o.id)).filter(Boolean);

    for (const po of rawOrders) {
      const poId = pi(po.id);
      const lo = po.linked_objects as Record<string, Record<string, unknown>> | null | undefined;
      if (lo && typeof lo === 'object') {
        // Dolibarr element type for supplier invoices is 'facture_fourn'
        for (const key of ['facture_fourn', 'supplierinvoice', 'invoice_supplier']) {
          const section = lo[key];
          if (section && typeof section === 'object') {
            for (const idStr of Object.keys(section)) {
              const invId = Number(idStr);
              if (invId > 0) {
                if (!poToInvoiceIds.has(poId)) poToInvoiceIds.set(poId, new Set());
                poToInvoiceIds.get(poId)!.add(invId);
                linkedInvoiceIds.add(invId);
              }
            }
          }
        }
      }
    }

    // ── Query DB for invoices — Strategy A + Strategy B ───────────────────
    // Strategy A: invoices whose dolibarr_id is in linkedInvoiceIds (from linked_objects above)
    // Strategy B: invoices created directly from a PO (origin_type='order_supplier' in dolibarr_raw)
    const linkedIdsArr = [...linkedInvoiceIds];
    const linkedPlaceholders = linkedIdsArr.length > 0
      ? linkedIdsArr.map(() => '?').join(',')
      : 'NULL';
    const poPlaceholders = allPoDolibarrIds.map(() => '?').join(',');

    const invoiceRows = (await prisma.$queryRawUnsafe(
      `SELECT
         si.dolibarr_id,
         si.ref,
         si.ref_supplier,
         CAST(si.total_ht AS DOUBLE) AS total_ht,
         CAST(si.total_ttc AS DOUBLE) AS total_ttc,
         DATE_FORMAT(si.date_invoice, '%Y-%m-%d') AS date_invoice,
         DATE_FORMAT(si.date_due, '%Y-%m-%d') AS date_due,
         si.is_paid,
         CASE
           WHEN JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_type')) = 'order_supplier'
             AND CAST(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_id')), '0') AS UNSIGNED) > 0
           THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_id')) AS UNSIGNED)
           ELSE NULL
         END AS origin_po_id
       FROM fin_supplier_invoices si
       WHERE si.is_active = 1
         AND (
           si.dolibarr_id IN (${linkedPlaceholders})
           OR (
             JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_type')) = 'order_supplier'
             AND CAST(IFNULL(JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_id')), '0') AS UNSIGNED) > 0
             AND CAST(JSON_UNQUOTE(JSON_EXTRACT(si.dolibarr_raw, '$.origin_id')) AS UNSIGNED) IN (${poPlaceholders})
           )
         )`,
      ...linkedIdsArr,
      ...allPoDolibarrIds,
    )) as InvoiceDbRow[];

    // ── Merge Strategy B into poToInvoiceIds ─────────────────────────────
    for (const row of invoiceRows) {
      if (row.origin_po_id && pi(row.origin_po_id) > 0) {
        const poId = pi(row.origin_po_id);
        const invId = pi(row.dolibarr_id);
        if (!poToInvoiceIds.has(poId)) poToInvoiceIds.set(poId, new Set());
        poToInvoiceIds.get(poId)!.add(invId);
      }
    }

    // ── Invoice + payment lookup maps ─────────────────────────────────────
    const invoiceMap = new Map<number, InvoiceDbRow>();
    for (const row of invoiceRows) {
      invoiceMap.set(pi(row.dolibarr_id), row);
    }

    const allInvoiceIds = [...invoiceMap.keys()];
    const paidMap = new Map<number, number>();
    if (allInvoiceIds.length > 0) {
      const paymentRows = (await prisma.$queryRawUnsafe(
        `SELECT invoice_dolibarr_id, SUM(amount) AS total_paid
         FROM fin_payments
         WHERE payment_type = 'supplier'
           AND invoice_dolibarr_id IN (${allInvoiceIds.map(() => '?').join(',')})
         GROUP BY invoice_dolibarr_id`,
        ...allInvoiceIds,
      )) as Array<{ invoice_dolibarr_id: number; total_paid: number }>;
      for (const p of paymentRows) paidMap.set(pi(p.invoice_dolibarr_id), pf(p.total_paid));
    }

    // ── Build typed PO records ────────────────────────────────────────────
    const toDateStrUnix = (v: number | string | null | undefined): string | null => {
      if (!v) return null;
      const ts = typeof v === 'number' ? v : parseInt(String(v), 10);
      if (!isNaN(ts) && ts > 0) return new Date(ts * 1000).toISOString().slice(0, 10);
      return null;
    };

    const poRecords: PORecord[] = rawOrders.map(o => {
      const poId = pi(o.id);
      const socid = pi(o.socid);
      const projId = (o.fk_projet ?? o.fk_project) ? pi(o.fk_projet ?? o.fk_project) : null;
      const supplierName = supplierNameMap.get(socid) ?? (o.supplier_name as string | null) ?? `Supplier #${socid}`;
      const project = projId ? (projectMap.get(projId) ?? { ref: '—', title: '' }) : { ref: '—', title: '' };

      const linkedIds = poToInvoiceIds.get(poId) ?? new Set<number>();
      const invoices: LinkedInvoice[] = [...linkedIds].flatMap(invId => {
        const row = invoiceMap.get(invId);
        if (!row) return [];
        const ttc = pf(row.total_ttc);
        const paid = paidMap.get(invId) ?? 0;
        return [{
          id: invId,
          ref: row.ref,
          refSupplier: row.ref_supplier,
          dateInvoice: row.date_invoice ?? null,
          dateDue: row.date_due ?? null,
          totalHT: pf(row.total_ht),
          totalTTC: ttc,
          isPaid: Number(row.is_paid) === 1,
          totalPaid: paid,
          balance: ttc - paid,
        }];
      });

      const invoiceTotalHT = invoices.reduce((s, i) => s + i.totalHT, 0);
      const invoiceTotalPaid = invoices.reduce((s, i) => s + i.totalPaid, 0);
      const invoiceBalance = invoices.reduce((s, i) => s + i.balance, 0);

      const poHT = pf(o.total_ht);
      let invoicingStatus: InvoicingStatus;
      if (invoices.length === 0) {
        invoicingStatus = 'no_invoice';
      } else if (invoiceTotalHT > poHT + 0.01) {
        invoicingStatus = 'over';
      } else if (invoiceTotalHT >= poHT - 0.01) {
        invoicingStatus = 'full';
      } else {
        invoicingStatus = 'partial';
      }

      return {
        id: poId,
        ref: o.ref,
        refSupplier: (o.ref_supplier as string | null) ?? null,
        supplierId: socid,
        supplierName,
        projectId: projId,
        projectRef: project.ref,
        projectTitle: project.title,
        status: String(o.statut ?? o.status ?? '0'),
        totalHT: poHT,
        totalTTC: pf(o.total_ttc),
        dateOrder: toDateStrUnix(o.date_commande),
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
      (a, b) =>
        b.receivedNoInvoiceCount - a.receivedNoInvoiceCount ||
        b.noInvoiceCount - a.noInvoiceCount ||
        b.poTotalHT - a.poTotalHT,
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
      invoiceCount: allInvoiceIds.length,
      stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
