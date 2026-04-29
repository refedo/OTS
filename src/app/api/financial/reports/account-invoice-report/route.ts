import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const accountCode = searchParams.get('accountCode');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!accountCode) {
    return NextResponse.json({ error: 'accountCode is required' }, { status: 400 });
  }

  const fromDate = from || '2000-01-01';
  const toDate = to || '2099-12-31';

  try {
    // ── Account label ─────────────────────────────────────────────────────────
    const labelRows: { account_label: string }[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(dolibarr_account_label, ots_cost_category, ?) AS account_label
      FROM fin_dolibarr_account_mapping
      WHERE dolibarr_account_id = ?
      LIMIT 1
    `, accountCode, accountCode);
    const accountLabel = labelRows[0]?.account_label ?? accountCode;

    // ── Invoices that contain at least one line for this account ──────────────
    const invoiceRows: {
      dolibarr_id: number;
      ref: string;
      ref_supplier: string | null;
      date_invoice: string | null;
      date_due: string | null;
      total_ht: number;
      total_tva: number;
      total_ttc: number;
      is_paid: number;
      status: number;
      fk_projet: number;
      project_ref: string;
      project_title: string;
      socid: number;
      supplier_name: string;
      account_total_ht: number;
    }[] = await prisma.$queryRawUnsafe(`
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
        COALESCE(dp.ref, '')    AS project_ref,
        COALESCE(dp.title, '')  AS project_title,
        si.socid,
        COALESCE(dt.name, '')   AS supplier_name,
        SUM(sil.total_ht)       AS account_total_ht
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN dolibarr_projects dp ON dp.dolibarr_id = si.fk_projet
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      WHERE si.is_active = 1
        AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
        AND sil.accounting_code = ?
      GROUP BY si.dolibarr_id, si.ref, si.ref_supplier, si.date_invoice, si.date_due,
               si.total_ht, si.total_tva, si.total_ttc, si.is_paid, si.status,
               si.fk_projet, project_ref, project_title, si.socid, supplier_name
      ORDER BY si.date_invoice DESC
    `, fromDate, toDate, accountCode);

    // ── Payments for those invoices ───────────────────────────────────────────
    const invoiceIds = invoiceRows.map((r) => Number(r.dolibarr_id));
    let paymentRows: { invoice_dolibarr_id: number; amount: number; payment_date: string | null; payment_method: string | null; dolibarr_ref: string | null }[] = [];
    if (invoiceIds.length > 0) {
      paymentRows = await prisma.$queryRawUnsafe(`
        SELECT invoice_dolibarr_id, amount, payment_date, payment_method, dolibarr_ref
        FROM fin_payments
        WHERE payment_type = 'supplier'
          AND invoice_dolibarr_id IN (${invoiceIds.map(() => '?').join(',')})
        ORDER BY payment_date ASC
      `, ...invoiceIds);
    }

    const paymentsByInvoice = new Map<number, { amount: number; date: string | null; method: string | null; ref: string | null }[]>();
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

    // ── Per-project total cost (all accounts) in date range ───────────────────
    const projectIds = [...new Set(invoiceRows.map((r) => Number(r.fk_projet)).filter((id) => id > 0))];
    let projectCostRows: { fk_projet: number; total_cost: number }[] = [];
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

    // ── Grand total (this account, all invoices) in range ─────────────────────
    const grandAccountRows: { grand_total: number }[] = await prisma.$queryRawUnsafe(`
      SELECT SUM(sil.total_ht) AS grand_total
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      WHERE si.is_active = 1
        AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
        AND sil.accounting_code = ?
    `, fromDate, toDate, accountCode);
    const grandAccountTotal = Number(grandAccountRows[0]?.grand_total ?? 0);

    // ── Grand total (all accounts) in range ───────────────────────────────────
    const grandTotalRows: { grand_total: number }[] = await prisma.$queryRawUnsafe(`
      SELECT SUM(total_ht) AS grand_total
      FROM fin_supplier_invoices
      WHERE is_active = 1 AND status >= 1
        AND date_invoice BETWEEN ? AND ?
    `, fromDate, toDate);
    const grandTotalAll = Number(grandTotalRows[0]?.grand_total ?? 0);

    // ── Build invoice list ────────────────────────────────────────────────────
    const invoices = invoiceRows.map((inv) => {
      const id = Number(inv.dolibarr_id);
      const payments = paymentsByInvoice.get(id) ?? [];
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const accountHT = Number(inv.account_total_ht);
      const totalTTC = Number(inv.total_ttc);
      const balance = totalTTC - totalPaid;
      return {
        id,
        ref: inv.ref,
        refSupplier: inv.ref_supplier,
        dateInvoice: inv.date_invoice ? new Date(inv.date_invoice).toISOString().slice(0, 10) : null,
        dateDue: inv.date_due ? new Date(inv.date_due).toISOString().slice(0, 10) : null,
        totalHT: Number(inv.total_ht),
        totalVAT: Number(inv.total_tva),
        totalTTC,
        accountHT,
        isPaid: inv.is_paid === 1,
        status: Number(inv.status),
        projectId: Number(inv.fk_projet) || null,
        projectRef: inv.project_ref || null,
        projectTitle: inv.project_title || null,
        supplierId: Number(inv.socid) || null,
        supplierName: inv.supplier_name || null,
        payments,
        totalPaid,
        balance,
      };
    });

    // ── Per-project summary ───────────────────────────────────────────────────
    const projectMap = new Map<string, {
      projectId: number | null;
      projectRef: string;
      projectTitle: string;
      invoiceCount: number;
      accountHT: number;
      totalPaid: number;
      balance: number;
      projectTotalCost: number;
      pctOfProjectCost: number;
    }>();

    for (const inv of invoices) {
      const key = inv.projectId ? String(inv.projectId) : '__no_project__';
      if (!projectMap.has(key)) {
        const projectTotalCost = inv.projectId ? (projectCostMap.get(inv.projectId) ?? 0) : 0;
        projectMap.set(key, {
          projectId: inv.projectId,
          projectRef: inv.projectRef ?? 'No Project',
          projectTitle: inv.projectTitle ?? 'No Project',
          invoiceCount: 0,
          accountHT: 0,
          totalPaid: 0,
          balance: 0,
          projectTotalCost,
          pctOfProjectCost: 0,
        });
      }
      const entry = projectMap.get(key)!;
      entry.invoiceCount += 1;
      entry.accountHT += inv.accountHT;
      entry.totalPaid += inv.totalPaid;
      entry.balance += inv.balance;
    }

    const projectSummary = [...projectMap.values()].map((p) => ({
      ...p,
      pctOfProjectCost: p.projectTotalCost > 0 ? (p.accountHT / p.projectTotalCost) * 100 : 0,
    })).sort((a, b) => b.accountHT - a.accountHT);

    const totalPaid = invoices.reduce((s, i) => s + i.totalPaid, 0);
    const totalBalance = invoices.reduce((s, i) => s + i.balance, 0);
    const pctOfGrandTotal = grandTotalAll > 0 ? (grandAccountTotal / grandTotalAll) * 100 : 0;

    return NextResponse.json({
      account: { code: accountCode, label: accountLabel },
      period: { from: fromDate, to: toDate },
      summary: {
        invoiceCount: invoices.length,
        totalAccountHT: grandAccountTotal,
        totalPaid,
        totalBalance,
        pctOfGrandTotal,
        grandTotalAll,
      },
      projectSummary,
      invoices,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
