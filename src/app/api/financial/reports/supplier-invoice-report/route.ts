import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get('supplierId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!supplierId) {
    return NextResponse.json({ error: 'supplierId is required' }, { status: 400 });
  }

  const sid = parseInt(supplierId, 10);
  const fromDate = from || '2000-01-01';
  const toDate = to || '2099-12-31';

  try {
    // ── Supplier info ──────────────────────────────────────────────────────
    const supplierRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT dolibarr_id, name, code_supplier, email, phone, town
       FROM dolibarr_thirdparties WHERE dolibarr_id = ? LIMIT 1`,
      sid
    );
    if (!supplierRows.length) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    const supplier = supplierRows[0];

    // ── Invoices for this supplier in date range ────────────────────────────
    const invoiceRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.dolibarr_id,
        si.ref,
        si.ref_supplier,
        si.date_invoice,
        si.date_due,
        si.total_ht,
        si.total_tva,
        si.total_ttc,
        si.is_paid,
        si.status,
        si.fk_projet,
        COALESCE(dp.ref, '') AS project_ref,
        COALESCE(dp.title, '') AS project_title
      FROM fin_supplier_invoices si
      LEFT JOIN dolibarr_projects dp ON dp.dolibarr_id = si.fk_projet
      WHERE si.socid = ?
        AND si.is_active = 1
        AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
      ORDER BY si.date_invoice DESC
    `, sid, fromDate, toDate);

    // ── Payments for those invoices ────────────────────────────────────────
    const invoiceIds = invoiceRows.map((r: any) => Number(r.dolibarr_id));
    let paymentRows: any[] = [];
    if (invoiceIds.length > 0) {
      paymentRows = await prisma.$queryRawUnsafe(`
        SELECT invoice_dolibarr_id, amount, payment_date, payment_method, dolibarr_ref
        FROM fin_payments
        WHERE payment_type = 'supplier'
          AND invoice_dolibarr_id IN (${invoiceIds.map(() => '?').join(',')})
        ORDER BY payment_date ASC
      `, ...invoiceIds);
    }

    const paymentsByInvoice = new Map<number, any[]>();
    for (const p of paymentRows) {
      const id = Number(p.invoice_dolibarr_id);
      if (!paymentsByInvoice.has(id)) paymentsByInvoice.set(id, []);
      paymentsByInvoice.get(id)!.push({
        amount: Number(p.amount),
        date: p.payment_date ? new Date(p.payment_date).toISOString().slice(0, 10) : null,
        method: p.payment_method,
        ref: p.dolibarr_ref,
      });
    }

    // ── Per-project total cost (all suppliers) in date range ───────────────
    const projectIds = [...new Set(
      invoiceRows.map((r: any) => Number(r.fk_projet)).filter((id) => id > 0)
    )];

    let projectCostRows: any[] = [];
    if (projectIds.length > 0) {
      projectCostRows = await prisma.$queryRawUnsafe(`
        SELECT fk_projet, SUM(total_ht) AS total_cost
        FROM fin_supplier_invoices
        WHERE is_active = 1 AND status >= 1
          AND date_invoice BETWEEN ? AND ?
          AND fk_projet IN (${projectIds.map(() => '?').join(',')})
        GROUP BY fk_projet
      `, fromDate, toDate, ...projectIds);
    }
    const projectCostMap = new Map<number, number>();
    for (const r of projectCostRows) {
      projectCostMap.set(Number(r.fk_projet), Number(r.total_cost));
    }

    // ── Grand total cost (all suppliers, all projects) in range ────────────
    const totalCostRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT SUM(total_ht) AS grand_total
      FROM fin_supplier_invoices
      WHERE is_active = 1 AND status >= 1
        AND date_invoice BETWEEN ? AND ?
    `, fromDate, toDate);
    const grandTotalCost = Number(totalCostRows[0]?.grand_total ?? 0);

    // ── Build invoice list ─────────────────────────────────────────────────
    const invoices = invoiceRows.map((inv: any) => {
      const id = Number(inv.dolibarr_id);
      const payments = paymentsByInvoice.get(id) ?? [];
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const totalHT = Number(inv.total_ht);
      const totalTTC = Number(inv.total_ttc);
      const balance = totalTTC - totalPaid;
      return {
        id,
        ref: inv.ref,
        refSupplier: inv.ref_supplier,
        dateInvoice: inv.date_invoice ? new Date(inv.date_invoice).toISOString().slice(0, 10) : null,
        dateDue: inv.date_due ? new Date(inv.date_due).toISOString().slice(0, 10) : null,
        totalHT,
        totalVAT: Number(inv.total_tva),
        totalTTC,
        isPaid: inv.is_paid === 1,
        status: Number(inv.status),
        projectId: Number(inv.fk_projet) || null,
        projectRef: inv.project_ref || null,
        projectTitle: inv.project_title || null,
        payments,
        totalPaid,
        balance,
      };
    });

    // ── Aggregate supplier KPIs ────────────────────────────────────────────
    const totalInvoicedHT = invoices.reduce((s, i) => s + i.totalHT, 0);
    const totalInvoicedTTC = invoices.reduce((s, i) => s + i.totalTTC, 0);
    const totalPaid = invoices.reduce((s, i) => s + i.totalPaid, 0);
    const totalBalance = invoices.reduce((s, i) => s + i.balance, 0);
    const pctOfGrandTotal = grandTotalCost > 0 ? (totalInvoicedHT / grandTotalCost) * 100 : 0;

    // ── Per-project summary ────────────────────────────────────────────────
    const projectMap = new Map<
      string,
      {
        projectId: number | null;
        projectRef: string;
        projectTitle: string;
        invoiceCount: number;
        totalHT: number;
        totalTTC: number;
        totalPaid: number;
        balance: number;
        projectTotalCost: number;
        pctOfProjectCost: number;
      }
    >();

    for (const inv of invoices) {
      const key = inv.projectId ? String(inv.projectId) : '__no_project__';
      if (!projectMap.has(key)) {
        const projectTotalCost = inv.projectId ? (projectCostMap.get(inv.projectId) ?? 0) : 0;
        projectMap.set(key, {
          projectId: inv.projectId,
          projectRef: inv.projectRef ?? 'No Project',
          projectTitle: inv.projectTitle ?? 'No Project',
          invoiceCount: 0,
          totalHT: 0,
          totalTTC: 0,
          totalPaid: 0,
          balance: 0,
          projectTotalCost,
          pctOfProjectCost: 0,
        });
      }
      const entry = projectMap.get(key)!;
      entry.invoiceCount += 1;
      entry.totalHT += inv.totalHT;
      entry.totalTTC += inv.totalTTC;
      entry.totalPaid += inv.totalPaid;
      entry.balance += inv.balance;
    }

    const projectSummary = [...projectMap.values()].map((p) => ({
      ...p,
      pctOfProjectCost: p.projectTotalCost > 0 ? (p.totalHT / p.projectTotalCost) * 100 : 0,
    })).sort((a, b) => b.totalHT - a.totalHT);

    return NextResponse.json({
      supplier: {
        id: Number(supplier.dolibarr_id),
        name: supplier.name,
        code: supplier.code_supplier,
        email: supplier.email,
        phone: supplier.phone,
        town: supplier.town,
      },
      period: { from: fromDate, to: toDate },
      summary: {
        invoiceCount: invoices.length,
        totalInvoicedHT,
        totalInvoicedTTC,
        totalPaid,
        totalBalance,
        pctOfGrandTotal,
        grandTotalCost,
      },
      projectSummary,
      invoices,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
