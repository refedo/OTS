import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const toDate = searchParams.get('to') || new Date().toISOString().slice(0, 10);

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        coa.account_code,
        coa.account_name,
        COALESCE(coa.account_category, 'Other') as account_category,
        COALESCE(SUM(je.debit), 0) as total_debit,
        COALESCE(SUM(je.credit), 0) as total_credit,
        COALESCE(SUM(je.debit) - SUM(je.credit), 0) as balance
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'asset' AND je.entry_date <= ?
      GROUP BY coa.account_code, coa.account_name, coa.account_category
      HAVING balance != 0
      ORDER BY coa.account_category, balance DESC
    `, toDate);

    const assets = rows.map((r: any) => ({
      accountCode: r.account_code,
      accountName: r.account_name,
      category: r.account_category,
      debit: Number(r.total_debit),
      credit: Number(r.total_credit),
      balance: Number(r.balance),
    }));

    return NextResponse.json({ assets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
