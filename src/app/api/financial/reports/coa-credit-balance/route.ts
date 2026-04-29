import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const typeFilter = searchParams.get('type'); // optional account_type filter

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  }

  try {
    // Opening balances (before period)
    const openingRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.account_type,
        coa.account_category,
        coa.display_order,
        COALESCE(SUM(je.debit), 0)  AS open_debit,
        COALESCE(SUM(je.credit), 0) AS open_credit
      FROM fin_chart_of_accounts coa
      LEFT JOIN fin_journal_entries je
        ON je.account_code = coa.account_code AND je.entry_date < ?
      ${typeFilter ? "WHERE coa.account_type = ?" : ""}
      GROUP BY coa.account_code, coa.account_name, coa.account_name_ar,
               coa.account_type, coa.account_category, coa.display_order
      ORDER BY coa.display_order, coa.account_code
    `, ...(typeFilter ? [from, typeFilter] : [from]));

    // Period movements
    const periodRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        je.account_code,
        COALESCE(SUM(je.debit), 0)  AS period_debit,
        COALESCE(SUM(je.credit), 0) AS period_credit
      FROM fin_journal_entries je
      WHERE je.entry_date BETWEEN ? AND ?
      GROUP BY je.account_code
    `, from, to);

    const periodMap = new Map<string, { debit: number; credit: number }>();
    for (const r of periodRows) {
      periodMap.set(r.account_code, { debit: Number(r.period_debit), credit: Number(r.period_credit) });
    }

    const accounts = openingRows.map((r: any) => {
      const openDebit = Number(r.open_debit);
      const openCredit = Number(r.open_credit);
      const openBalance = openDebit - openCredit; // positive = debit balance, negative = credit balance

      const period = periodMap.get(r.account_code) ?? { debit: 0, credit: 0 };
      const closingBalance = openBalance + period.debit - period.credit;

      // Net credit = net credit closing balance (positive means credit-normal)
      const netCredit = openCredit + period.credit;
      const netDebit = openDebit + period.debit;

      return {
        accountCode: r.account_code,
        accountName: r.account_name,
        accountNameAr: r.account_name_ar ?? null,
        accountType: r.account_type,
        accountCategory: r.account_category ?? null,
        displayOrder: Number(r.display_order ?? 0),
        openingDebit: openDebit,
        openingCredit: openCredit,
        openingBalance,
        periodDebit: period.debit,
        periodCredit: period.credit,
        closingDebit: closingBalance > 0 ? closingBalance : 0,
        closingCredit: closingBalance < 0 ? Math.abs(closingBalance) : 0,
        closingBalance,
        netDebit,
        netCredit,
      };
    });

    // Group by account type
    const byType = new Map<string, typeof accounts>();
    for (const acc of accounts) {
      if (!byType.has(acc.accountType)) byType.set(acc.accountType, []);
      byType.get(acc.accountType)!.push(acc);
    }

    const groups = [...byType.entries()].map(([type, accs]) => ({
      accountType: type,
      accounts: accs,
      totalOpeningDebit: accs.reduce((s, a) => s + a.openingDebit, 0),
      totalOpeningCredit: accs.reduce((s, a) => s + a.openingCredit, 0),
      totalPeriodDebit: accs.reduce((s, a) => s + a.periodDebit, 0),
      totalPeriodCredit: accs.reduce((s, a) => s + a.periodCredit, 0),
      totalClosingDebit: accs.reduce((s, a) => s + a.closingDebit, 0),
      totalClosingCredit: accs.reduce((s, a) => s + a.closingCredit, 0),
    }));

    return NextResponse.json({
      period: { from, to },
      accounts,
      groups,
      totals: {
        openingDebit: accounts.reduce((s, a) => s + a.openingDebit, 0),
        openingCredit: accounts.reduce((s, a) => s + a.openingCredit, 0),
        periodDebit: accounts.reduce((s, a) => s + a.periodDebit, 0),
        periodCredit: accounts.reduce((s, a) => s + a.periodCredit, 0),
        closingDebit: accounts.reduce((s, a) => s + a.closingDebit, 0),
        closingCredit: accounts.reduce((s, a) => s + a.closingCredit, 0),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
