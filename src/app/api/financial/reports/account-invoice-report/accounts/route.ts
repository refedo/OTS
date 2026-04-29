import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const accounts: { accounting_code: string; account_label: string; total_ht: number }[] =
      await prisma.$queryRawUnsafe(`
        SELECT
          sil.accounting_code,
          COALESCE(dam.dolibarr_account_label, dam.ots_cost_category, sil.accounting_code) AS account_label,
          SUM(sil.total_ht) AS total_ht
        FROM fin_supplier_invoice_lines sil
        JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
        LEFT JOIN fin_dolibarr_account_mapping dam ON dam.dolibarr_account_id = sil.accounting_code
        WHERE si.is_active = 1
          AND si.status >= 1
          AND sil.accounting_code IS NOT NULL
          AND sil.accounting_code != ''
        GROUP BY sil.accounting_code, account_label
        ORDER BY total_ht DESC
      `);

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        code: a.accounting_code,
        label: a.account_label,
        totalHT: Number(a.total_ht),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
