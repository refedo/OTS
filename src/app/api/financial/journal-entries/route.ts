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
  const accountCode = searchParams.get('account_code');
  const journalCode = searchParams.get('journal_code');
  const sourceType = searchParams.get('source_type');
  const groupBy = searchParams.get('groupBy');
  const exportFormat = searchParams.get('export');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  try {
    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (from) { where += ' AND je.entry_date >= ?'; params.push(from); }
    if (to) { where += ' AND je.entry_date <= ?'; params.push(to); }
    if (accountCode) { where += ' AND je.account_code = ?'; params.push(accountCode); }
    if (journalCode) { where += ' AND je.journal_code = ?'; params.push(journalCode); }
    if (sourceType) { where += ' AND je.source_type = ?'; params.push(sourceType); }

    // Hierarchy view grouped by account
    if (groupBy === 'account') {
      const accountsData: any[] = await prisma.$queryRawUnsafe(
        `SELECT je.account_code, coa.account_name, coa.account_type,
                SUM(je.debit) as total_debit, SUM(je.credit) as total_credit,
                COUNT(*) as entry_count
         FROM fin_journal_entries je
         LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
         ${where}
         GROUP BY je.account_code, coa.account_name, coa.account_type
         ORDER BY coa.account_type, je.account_code`,
        ...params
      );

      // Get entries for each account (limited)
      const accounts = await Promise.all(accountsData.map(async (acct: any) => {
        const accountParams = [...params, acct.account_code];
        const entries: any[] = await prisma.$queryRawUnsafe(
          `SELECT je.entry_date, je.journal_code, je.label, je.debit, je.credit, je.source_type
           FROM fin_journal_entries je
           WHERE ${where.replace('WHERE ', '')} AND je.account_code = ?
           ORDER BY je.entry_date DESC
           LIMIT 100`,
          ...accountParams
        );
        return {
          account_code: acct.account_code,
          account_name: acct.account_name,
          account_type: acct.account_type,
          total_debit: Number(acct.total_debit),
          total_credit: Number(acct.total_credit),
          balance: Number(acct.total_debit) - Number(acct.total_credit),
          entry_count: Number(acct.entry_count),
          entries: entries.map((e: any) => ({
            entry_date: e.entry_date ? new Date(e.entry_date).toISOString().slice(0, 10) : '',
            journal_code: e.journal_code,
            description: e.label,
            debit: Number(e.debit),
            credit: Number(e.credit),
            source_type: e.source_type,
          })),
        };
      }));

      return NextResponse.json({ accounts });
    }

    // Excel export
    if (exportFormat === 'excel') {
      const allRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT je.entry_date, je.journal_code, je.account_code, coa.account_name,
                je.label, je.debit, je.credit, je.source_type, je.piece_num
         FROM fin_journal_entries je
         LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
         ${where}
         ORDER BY je.entry_date DESC, je.piece_num, je.id
         LIMIT ${limit}`,
        ...params
      );

      // Generate CSV (Excel-compatible)
      const headers = ['Date', 'Journal', 'Account Code', 'Account Name', 'Description', 'Debit', 'Credit', 'Source', 'Piece #'];
      const csvRows = [headers.join(',')];
      for (const row of allRows) {
        csvRows.push([
          row.entry_date ? new Date(row.entry_date).toISOString().slice(0, 10) : '',
          row.journal_code || '',
          row.account_code || '',
          `"${(row.account_name || '').replace(/"/g, '""')}"`,
          `"${(row.label || '').replace(/"/g, '""')}"`,
          Number(row.debit || 0).toFixed(2),
          Number(row.credit || 0).toFixed(2),
          row.source_type || '',
          row.piece_num || '',
        ].join(','));
      }

      const csvContent = csvRows.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="journal-entries-${from || 'all'}-to-${to || 'all'}.csv"`,
        },
      });
    }

    // Standard list view
    const countRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM fin_journal_entries je ${where}`, ...params
    );
    const total = Number(countRows[0]?.cnt || 0);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT je.*, coa.account_name, coa.account_type
       FROM fin_journal_entries je
       LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
       ${where}
       ORDER BY je.entry_date DESC, je.piece_num, je.id
       LIMIT ${limit} OFFSET ${offset}`,
      ...params
    );

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
