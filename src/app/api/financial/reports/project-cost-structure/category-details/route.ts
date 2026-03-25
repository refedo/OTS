import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const category = searchParams.get('category');

  if (!from || !to || !category) {
    return NextResponse.json({ error: 'from, to, and category parameters are required' }, { status: 400 });
  }

  try {
    // Get detailed breakdown by account within the category
    const accountDetails: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(pcoa.account_code, scoa.account_code, 'N/A') as account_code,
        COALESCE(pcoa.account_name, scoa.account_name, sil.product_label, 'Unknown') as account_name,
        COALESCE(
          pcoa.account_category,
          scoa.account_category,
          'Other / Unclassified'
        ) as cost_category,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_tva) as total_vat,
        SUM(sil.total_ttc) as total_ttc,
        COUNT(DISTINCT sil.invoice_dolibarr_id) as invoice_count,
        COUNT(*) as line_count
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = sil.fk_product
      LEFT JOIN fin_chart_of_accounts pcoa ON pcoa.account_code = pm.coa_account_code
      LEFT JOIN fin_supplier_coa_default sd ON sd.supplier_dolibarr_id = si.socid
      LEFT JOIN fin_chart_of_accounts scoa ON scoa.account_code = sd.coa_account_code
      WHERE si.is_active = 1 AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
        AND COALESCE(pcoa.account_category, scoa.account_category, 'Other / Unclassified') = ?
      GROUP BY account_code, account_name, cost_category
      ORDER BY total_ht DESC
    `, from, to, category);

    const accounts = (accountDetails as Record<string, unknown>[]).map((row) => ({
      accountCode: row.account_code as string,
      accountName: row.account_name as string,
      totalHT: Number(row.total_ht),
      totalVAT: Number(row.total_vat),
      totalTTC: Number(row.total_ttc),
      invoiceCount: Number(row.invoice_count),
      lineCount: Number(row.line_count),
    }));

    const totalHT = accounts.reduce((s, a) => s + a.totalHT, 0);

    return NextResponse.json({
      category,
      accounts: accounts.map(a => ({
        ...a,
        percentOfCategory: totalHT > 0 ? (a.totalHT / totalHT) * 100 : 0,
      })),
      totalHT,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
