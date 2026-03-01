import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

/**
 * Expenses by Account Report
 * Groups supplier invoice expenses by accounting account with monthly breakdown
 */
export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const exportFormat = searchParams.get('export');

  try {
    // Get expenses grouped by accounting account and month
    const expenses: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        sil.accounting_code,
        COALESCE(dam.dolibarr_account_code, sil.accounting_code) as account_code,
        COALESCE(dam.dolibarr_account_label, 'Unknown Account') as account_label,
        MONTH(si.date_invoice) as month,
        SUM(sil.total_ht) as amount
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_dolibarr_account_mapping dam ON dam.dolibarr_account_id = sil.accounting_code
      WHERE si.is_active = 1 
        AND si.status >= 1
        AND YEAR(si.date_invoice) = ?
        AND sil.accounting_code IS NOT NULL
        AND sil.accounting_code != ''
      GROUP BY sil.accounting_code, account_code, account_label, month
      ORDER BY account_code, month
    `, year);

    // Build account map with monthly data
    const accountMap = new Map<string, any>();
    
    for (const exp of expenses) {
      const key = exp.accounting_code;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          accountingCode: exp.accounting_code,
          accountCode: exp.account_code,
          accountLabel: exp.account_label,
          months: Array(12).fill(0),
          total: 0,
        });
      }
      
      const account = accountMap.get(key)!;
      const monthIndex = Number(exp.month) - 1;
      const amount = Number(exp.amount);
      account.months[monthIndex] = amount;
      account.total += amount;
    }

    // Convert to array and sort by account code
    const accounts = Array.from(accountMap.values()).sort((a, b) => 
      a.accountCode.localeCompare(b.accountCode)
    );

    // Calculate monthly totals
    const monthlyTotals = Array(12).fill(0);
    let grandTotal = 0;
    
    for (const acc of accounts) {
      for (let i = 0; i < 12; i++) {
        monthlyTotals[i] += acc.months[i];
      }
      grandTotal += acc.total;
    }

    // Export to CSV if requested
    if (exportFormat === 'excel') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // UTF-8 BOM for Excel compatibility
      let csv = '\uFEFF';
      
      // Header
      csv += 'Account,Account Name,' + monthNames.join(',') + ',Total\n';
      
      // Data rows
      for (const acc of accounts) {
        const row = [
          acc.accountCode,
          `"${acc.accountLabel}"`,
          ...acc.months.map((m: number) => m.toFixed(2)),
          acc.total.toFixed(2)
        ];
        csv += row.join(',') + '\n';
      }
      
      // Totals row
      csv += 'TOTAL,"",' + monthlyTotals.map(t => t.toFixed(2)).join(',') + ',' + grandTotal.toFixed(2) + '\n';
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="expenses-by-account-${year}.csv"`,
        },
      });
    }

    // Return JSON
    return NextResponse.json({
      year,
      accounts,
      monthlyTotals,
      grandTotal,
      summary: {
        accountCount: accounts.length,
        totalExpenses: grandTotal,
      },
    });
  } catch (error: any) {
    console.error('[Expenses by Account] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
