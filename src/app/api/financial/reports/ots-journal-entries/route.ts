import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

/**
 * OTS Journal Entries Report
 * 
 * Generates proper double-entry journal entries from supplier invoices
 * with expense categorization based on fin_dolibarr_account_mapping.
 * 
 * This provides better expense categorization than flat Dolibarr journal entries.
 * 
 * Journal Entry Structure per Supplier Invoice:
 * - DR: Expense Account (by category from mapping)  = total_ht
 * - DR: VAT Input Account                           = total_tva
 * - CR: Accounts Payable                            = total_ttc
 */

interface JournalEntry {
  entryDate: string;
  pieceNum: string;
  sourceRef: string;
  sourceType: 'supplier_invoice' | 'customer_invoice' | 'payment';
  supplierName: string;
  projectRef: string | null;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

interface JournalLine {
  accountCode: string;
  accountName: string;
  costCategory: string;
  description: string;
  debit: number;
  credit: number;
}

interface CategorySummary {
  category: string;
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  netAmount: number;
  entryCount: number;
  percentOfTotal: number;
}

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const projectId = searchParams.get('project_id');
  const supplierId = searchParams.get('supplier_id');
  const category = searchParams.get('category');
  const groupBy = searchParams.get('groupBy'); // 'category', 'supplier', 'project', 'month'
  const exportFormat = searchParams.get('export'); // 'excel'
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  if (!from || !to) {
    return NextResponse.json({ error: 'from and to date parameters are required' }, { status: 400 });
  }

  try {
    // Build WHERE clause
    let where = `WHERE si.is_active = 1 AND si.status >= 1 AND si.date_invoice BETWEEN ? AND ?`;
    const params: any[] = [from, to];

    if (projectId) {
      where += ` AND si.fk_projet = ?`;
      params.push(parseInt(projectId));
    }
    if (supplierId) {
      where += ` AND si.socid = ?`;
      params.push(parseInt(supplierId));
    }
    if (category) {
      where += ` AND COALESCE(dam.ots_cost_category, 'Other / Unclassified') = ?`;
      params.push(category);
    }

    // Get supplier invoice lines with proper categorization
    const invoiceLines: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.dolibarr_id as invoice_id,
        si.ref as invoice_ref,
        si.date_invoice,
        si.socid as supplier_id,
        dt.name as supplier_name,
        si.fk_projet as project_id,
        dp.ref as project_ref,
        si.total_ht,
        si.total_tva,
        si.total_ttc,
        sil.id as line_id,
        sil.product_label,
        sil.product_ref,
        sil.total_ht as line_ht,
        sil.total_tva as line_vat,
        sil.total_ttc as line_ttc,
        sil.accounting_code,
        COALESCE(dam.ots_cost_category, 'Other / Unclassified') as cost_category,
        COALESCE(dam.dolibarr_account_label, sil.product_label, 'Expense') as account_name,
        COALESCE(dam.ots_coa_code, '601000') as expense_account_code
      FROM fin_supplier_invoices si
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      LEFT JOIN dolibarr_projects dp ON dp.dolibarr_id = si.fk_projet
      LEFT JOIN fin_supplier_invoice_lines sil ON sil.invoice_dolibarr_id = si.dolibarr_id
      LEFT JOIN fin_dolibarr_account_mapping dam ON dam.dolibarr_account_id = sil.accounting_code
      ${where}
      ORDER BY si.date_invoice DESC, si.ref, sil.id
    `, ...params);

    // Get config for account codes
    const configRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT config_key, config_value FROM fin_config 
      WHERE config_key IN ('default_ap_account', 'vat_input_15_account', 'vat_input_5_account')
    `);
    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.config_key] = row.config_value;
    }
    const apAccount = config['default_ap_account'] || '401000';
    const vatInput15 = config['vat_input_15_account'] || '445661';
    const vatInput5 = config['vat_input_5_account'] || '445662';

    // Group lines by invoice to create journal entries
    const invoiceMap = new Map<number, any>();
    for (const line of invoiceLines) {
      const invId = Number(line.invoice_id);
      if (!invoiceMap.has(invId)) {
        invoiceMap.set(invId, {
          invoiceId: invId,
          invoiceRef: line.invoice_ref,
          dateInvoice: line.date_invoice,
          supplierId: Number(line.supplier_id),
          supplierName: line.supplier_name || 'Unknown Supplier',
          projectId: line.project_id ? Number(line.project_id) : null,
          projectRef: line.project_ref || null,
          totalHT: Number(line.total_ht),
          totalVAT: Number(line.total_tva),
          totalTTC: Number(line.total_ttc),
          lines: [],
        });
      }
      if (line.line_id) {
        invoiceMap.get(invId)!.lines.push({
          lineId: Number(line.line_id),
          productLabel: line.product_label || 'N/A',
          productRef: line.product_ref || '',
          lineHT: Number(line.line_ht),
          lineVAT: Number(line.line_vat),
          lineTTC: Number(line.line_ttc),
          accountingCode: line.accounting_code,
          costCategory: line.cost_category,
          accountName: line.account_name,
          expenseAccountCode: line.expense_account_code,
        });
      }
    }

    // Generate journal entries
    const journalEntries: JournalEntry[] = [];
    const categorySummaryMap = new Map<string, CategorySummary>();
    let totalExpenses = 0;
    let totalVAT = 0;
    let totalPayables = 0;

    for (const inv of invoiceMap.values()) {
      const entryDate = inv.dateInvoice ? new Date(inv.dateInvoice).toISOString().slice(0, 10) : '';
      const journalLines: JournalLine[] = [];

      // Group expense lines by category for cleaner entries
      const categoryTotals = new Map<string, { ht: number; vat: number; accountCode: string; accountName: string }>();
      
      for (const line of inv.lines) {
        const cat = line.costCategory;
        if (!categoryTotals.has(cat)) {
          categoryTotals.set(cat, { 
            ht: 0, 
            vat: 0, 
            accountCode: line.expenseAccountCode,
            accountName: line.accountName 
          });
        }
        const ct = categoryTotals.get(cat)!;
        ct.ht += line.lineHT;
        ct.vat += line.lineVAT;
      }

      // Create debit lines for each expense category
      for (const [cat, totals] of categoryTotals.entries()) {
        if (totals.ht > 0) {
          journalLines.push({
            accountCode: totals.accountCode,
            accountName: totals.accountName,
            costCategory: cat,
            description: `${cat} - ${inv.supplierName}`,
            debit: totals.ht,
            credit: 0,
          });
          totalExpenses += totals.ht;

          // Update category summary
          if (!categorySummaryMap.has(cat)) {
            categorySummaryMap.set(cat, {
              category: cat,
              accountCode: totals.accountCode,
              accountName: totals.accountName,
              totalDebit: 0,
              totalCredit: 0,
              netAmount: 0,
              entryCount: 0,
              percentOfTotal: 0,
            });
          }
          const cs = categorySummaryMap.get(cat)!;
          cs.totalDebit += totals.ht;
          cs.netAmount += totals.ht;
          cs.entryCount += 1;
        }
      }

      // VAT Input line (debit)
      if (inv.totalVAT > 0) {
        const vatRate = inv.totalVAT / inv.totalHT;
        const vatAccount = vatRate > 0.10 ? vatInput15 : vatInput5;
        journalLines.push({
          accountCode: vatAccount,
          accountName: vatRate > 0.10 ? 'VAT Input 15%' : 'VAT Input 5%',
          costCategory: 'VAT',
          description: `VAT on ${inv.invoiceRef}`,
          debit: inv.totalVAT,
          credit: 0,
        });
        totalVAT += inv.totalVAT;
      }

      // Accounts Payable line (credit)
      journalLines.push({
        accountCode: apAccount,
        accountName: 'Accounts Payable - Trade',
        costCategory: 'Liability',
        description: `Payable to ${inv.supplierName} - ${inv.invoiceRef}`,
        debit: 0,
        credit: inv.totalTTC,
      });
      totalPayables += inv.totalTTC;

      const totalDebit = journalLines.reduce((s, l) => s + l.debit, 0);
      const totalCredit = journalLines.reduce((s, l) => s + l.credit, 0);

      journalEntries.push({
        entryDate,
        pieceNum: inv.invoiceRef,
        sourceRef: inv.invoiceRef,
        sourceType: 'supplier_invoice',
        supplierName: inv.supplierName,
        projectRef: inv.projectRef,
        lines: journalLines,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      });
    }

    // Calculate percentages for category summary
    const categorySummary = Array.from(categorySummaryMap.values())
      .map(cs => ({
        ...cs,
        percentOfTotal: totalExpenses > 0 ? (cs.totalDebit / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.totalDebit - a.totalDebit);

    // Handle groupBy
    if (groupBy === 'category') {
      // Group journal entries by cost category
      const categoryGroups = new Map<string, { entries: JournalEntry[]; totalDebit: number; totalCredit: number }>();
      
      for (const entry of journalEntries) {
        for (const line of entry.lines) {
          if (line.debit > 0 && line.costCategory !== 'VAT') {
            const cat = line.costCategory;
            if (!categoryGroups.has(cat)) {
              categoryGroups.set(cat, { entries: [], totalDebit: 0, totalCredit: 0 });
            }
            const group = categoryGroups.get(cat)!;
            group.entries.push(entry);
            group.totalDebit += line.debit;
          }
        }
      }

      const groupedData = Array.from(categoryGroups.entries()).map(([category, data]) => ({
        category,
        entryCount: data.entries.length,
        totalDebit: data.totalDebit,
        percentOfTotal: totalExpenses > 0 ? (data.totalDebit / totalExpenses) * 100 : 0,
        entries: data.entries.slice(0, 20), // Limit entries per category
      })).sort((a, b) => b.totalDebit - a.totalDebit);

      return NextResponse.json({
        groupBy: 'category',
        fromDate: from,
        toDate: to,
        groups: groupedData,
        summary: {
          totalExpenses,
          totalVAT,
          totalPayables,
          categoryCount: categorySummary.length,
          entryCount: journalEntries.length,
        },
        categorySummary,
      });
    }

    // Handle Excel export
    if (exportFormat === 'excel') {
      const headers = ['Date', 'Piece #', 'Source Ref', 'Supplier', 'Project', 'Account Code', 'Account Name', 'Category', 'Description', 'Debit', 'Credit'];
      const csvRows = [headers.join(',')];

      for (const entry of journalEntries) {
        for (const line of entry.lines) {
          csvRows.push([
            entry.entryDate,
            entry.pieceNum,
            entry.sourceRef,
            `"${(entry.supplierName || '').replace(/"/g, '""')}"`,
            entry.projectRef || '',
            line.accountCode,
            `"${(line.accountName || '').replace(/"/g, '""')}"`,
            line.costCategory,
            `"${(line.description || '').replace(/"/g, '""')}"`,
            line.debit.toFixed(2),
            line.credit.toFixed(2),
          ].join(','));
        }
        // Add empty row between entries for readability
        csvRows.push('');
      }

      const csvContent = csvRows.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ots-journal-entries-${from}-to-${to}.csv"`,
        },
      });
    }

    // Paginate entries
    const total = journalEntries.length;
    const paginatedEntries = journalEntries.slice(offset, offset + limit);

    return NextResponse.json({
      fromDate: from,
      toDate: to,
      data: paginatedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalExpenses,
        totalVAT,
        totalPayables,
        categoryCount: categorySummary.length,
        entryCount: total,
        isAllBalanced: journalEntries.every(e => e.isBalanced),
      },
      categorySummary,
    });
  } catch (error: any) {
    console.error('[OTS Journal Entries] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
