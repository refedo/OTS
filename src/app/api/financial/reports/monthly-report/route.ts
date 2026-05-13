import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year  = parseInt(searchParams.get('year')  || now.getFullYear().toString(), 10);
  const month = parseInt(searchParams.get('month') || (now.getMonth() + 1).toString(), 10);
  const toYear  = parseInt(searchParams.get('toYear')  || year.toString(), 10);
  const toMonth = parseInt(searchParams.get('toMonth') || month.toString(), 10);

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd = toMonth === 12
    ? `${toYear + 1}-01-01`
    : `${toYear}-${String(toMonth + 1).padStart(2, '0')}-01`;

  try {
    // ── Income: customer payments grouped by client ──────────────────────────
    let incomeRows: any[] = [];
    try {
      incomeRows = await prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(dt.name, CONCAT('Client #', inv.socid)) AS entity_name,
          SUM(fp.amount)                                    AS total_amount,
          COUNT(DISTINCT fp.id)                             AS payment_count,
          COUNT(DISTINCT inv.dolibarr_id)                   AS invoice_count
        FROM fin_payments fp
        LEFT JOIN fin_customer_invoices inv ON inv.dolibarr_id = fp.invoice_dolibarr_id
        LEFT JOIN dolibarr_thirdparties   dt  ON dt.dolibarr_id  = inv.socid
        WHERE fp.payment_type = 'customer'
          AND fp.payment_date >= ? AND fp.payment_date < ?
        GROUP BY COALESCE(dt.name, CONCAT('Client #', inv.socid))
        ORDER BY total_amount DESC
      `, monthStart, monthEnd);
    } catch { /* table may be empty */ }

    // ── Expenses: supplier payments grouped by supplier ───────────────────────
    let expenseRows: any[] = [];
    try {
      expenseRows = await prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(dt.name, CONCAT('Supplier #', inv.socid)) AS entity_name,
          SUM(fp.amount)                                      AS total_amount,
          COUNT(DISTINCT fp.id)                               AS payment_count,
          COUNT(DISTINCT inv.dolibarr_id)                     AS invoice_count
        FROM fin_payments fp
        LEFT JOIN fin_supplier_invoices inv ON inv.dolibarr_id = fp.invoice_dolibarr_id
        LEFT JOIN dolibarr_thirdparties  dt  ON dt.dolibarr_id  = inv.socid
        WHERE fp.payment_type = 'supplier'
          AND fp.payment_date >= ? AND fp.payment_date < ?
        GROUP BY COALESCE(dt.name, CONCAT('Supplier #', inv.socid))
        ORDER BY total_amount DESC
      `, monthStart, monthEnd);
    } catch { /* table may be empty */ }

    // ── Salaries for the period ─────────────────────────────────────────────────
    let salaryRows: any[] = [];
    try {
      salaryRows = await prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(label, ref, CONCAT('Salary #', dolibarr_id)) AS label,
          ref,
          amount,
          is_paid
        FROM fin_salaries
        WHERE is_active = 1
          AND date_start >= ? AND date_start < ?
        ORDER BY amount DESC
      `, monthStart, monthEnd);
    } catch { /* table may be empty */ }

    // ── VAT summary for the period ──────────────────────────────────────────────
    let totalVatOut = 0, totalVatIn = 0;
    try {
      const vatOutRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(cil.total_tva), 0) AS total
        FROM fin_customer_invoice_lines cil
        JOIN fin_customer_invoices ci ON ci.dolibarr_id = cil.invoice_dolibarr_id
        WHERE ci.status IN (1, 2) AND ci.is_active = 1
          AND ci.date_invoice >= ? AND ci.date_invoice < ?
      `, monthStart, monthEnd);
      totalVatOut = Number(vatOutRows[0]?.total || 0);
    } catch { /* */ }
    try {
      const vatInRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(sil.total_tva), 0) AS total
        FROM fin_supplier_invoice_lines sil
        JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
        WHERE si.status IN (1, 2) AND si.is_active = 1
          AND si.date_invoice >= ? AND si.date_invoice < ?
      `, monthStart, monthEnd);
      totalVatIn = Number(vatInRows[0]?.total || 0);
    } catch { /* */ }

    const income = incomeRows.map((r: any) => ({
      entityName:   r.entity_name   || 'Unknown',
      totalAmount:  Number(r.total_amount  || 0),
      paymentCount: Number(r.payment_count || 0),
      invoiceCount: Number(r.invoice_count || 0),
    }));

    const expenses = expenseRows.map((r: any) => ({
      entityName:   r.entity_name   || 'Unknown',
      totalAmount:  Number(r.total_amount  || 0),
      paymentCount: Number(r.payment_count || 0),
      invoiceCount: Number(r.invoice_count || 0),
    }));

    const salaries = salaryRows.map((r: any) => ({
      label:  r.label  || r.ref || 'Salary',
      ref:    r.ref    || '',
      amount: Number(r.amount  || 0),
      isPaid: r.is_paid === 1,
    }));

    const totalIncome   = income.reduce((s, r) => s + r.totalAmount, 0);
    const totalSupplier = expenses.reduce((s, r) => s + r.totalAmount, 0);
    const totalSalaries = salaries.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = totalSupplier + totalSalaries;
    const grossProfit   = totalIncome - totalSupplier;
    const netProfit     = totalIncome - totalExpenses;

    return NextResponse.json({
      year,
      month,
      toYear,
      toMonth,
      monthStart,
      income,
      expenses,
      salaries,
      totals: {
        totalIncome,
        totalSupplier,
        totalSalaries,
        totalExpenses,
        grossProfit,
        netProfit,
        netMarginPct: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
        totalVatOut,
        totalVatIn,
        netVat: totalVatOut - totalVatIn,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
