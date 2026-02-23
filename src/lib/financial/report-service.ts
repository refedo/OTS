/**
 * Financial Report Generation Service
 * 
 * Generates Trial Balance, Income Statement, Balance Sheet,
 * VAT Report, and Aging Report from journal entries.
 */

import prisma from '@/lib/db';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';

// ============================================
// TYPES
// ============================================

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountNameAr: string | null;
  accountType: string;
  accountCategory: string | null;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceReport {
  fromDate: string;
  toDate: string;
  rows: TrialBalanceRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    periodDebit: number;
    periodCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
  isBalanced: boolean;
}

export interface IncomeStatementSection {
  category: string;
  accounts: {
    accountCode: string;
    accountName: string;
    amount: number;
    percentOfRevenue: number;
  }[];
  subtotal: number;
}

export interface IncomeStatementReport {
  fromDate: string;
  toDate: string;
  revenue: IncomeStatementSection[];
  totalRevenue: number;
  costOfSales: IncomeStatementSection[];
  totalCostOfSales: number;
  grossProfit: number;
  operatingExpenses: IncomeStatementSection[];
  totalOperatingExpenses: number;
  operatingProfit: number;
  otherIncome: number;
  otherExpenses: number;
  netProfit: number;
}

export interface BalanceSheetSection {
  category: string;
  accounts: {
    accountCode: string;
    accountName: string;
    balance: number;
  }[];
  subtotal: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: BalanceSheetSection[];
  totalAssets: number;
  liabilities: BalanceSheetSection[];
  totalLiabilities: number;
  equity: BalanceSheetSection[];
  totalEquity: number;
  netProfit: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export interface VatReportLine {
  vatRate: number;
  taxableBase: number;
  vatAmount: number;
  transactionCount: number;
}

export interface VatReport {
  fromDate: string;
  toDate: string;
  outputVat: VatReportLine[];
  totalOutputVat: number;
  inputVat: VatReportLine[];
  totalInputVat: number;
  netVatPayable: number;
}

export interface AgingBucket {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  total: number;
}

export interface AgingRow {
  thirdpartyId: number;
  thirdpartyName: string;
  invoices: {
    ref: string;
    dateInvoice: string;
    dateDue: string;
    totalAmount: number;
    amountPaid: number;
    remaining: number;
    ageBucket: string;
    daysOverdue: number;
    paymentTermsDays: number;
    paymentTermsLabel: string;
  }[];
  buckets: AgingBucket;
}

export interface AgingReport {
  type: 'ar' | 'ap';
  asOfDate: string;
  rows: AgingRow[];
  totals: AgingBucket;
}

// ============================================
// REPORT SERVICE
// ============================================

export class FinancialReportService {

  // ============================================
  // TRIAL BALANCE
  // ============================================

  async getTrialBalance(fromDate: string, toDate: string): Promise<TrialBalanceReport> {
    // Opening balances: all entries before fromDate
    const openingRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT je.account_code,
             coa.account_name, coa.account_name_ar, coa.account_type, coa.account_category,
             COALESCE(SUM(je.debit), 0) as total_debit,
             COALESCE(SUM(je.credit), 0) as total_credit
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE je.entry_date < ?
      GROUP BY je.account_code, coa.account_name, coa.account_name_ar, coa.account_type, coa.account_category
    `, fromDate);

    // Period movements
    const periodRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT je.account_code,
             coa.account_name, coa.account_name_ar, coa.account_type, coa.account_category,
             coa.display_order,
             COALESCE(SUM(je.debit), 0) as total_debit,
             COALESCE(SUM(je.credit), 0) as total_credit
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE je.entry_date BETWEEN ? AND ?
      GROUP BY je.account_code, coa.account_name, coa.account_name_ar, coa.account_type, coa.account_category, coa.display_order
      ORDER BY coa.display_order, je.account_code
    `, fromDate, toDate);

    // Merge into a single map
    const accountMap = new Map<string, TrialBalanceRow>();

    for (const row of openingRows) {
      accountMap.set(row.account_code, {
        accountCode: row.account_code,
        accountName: row.account_name,
        accountNameAr: row.account_name_ar,
        accountType: row.account_type,
        accountCategory: row.account_category,
        openingDebit: Number(row.total_debit),
        openingCredit: Number(row.total_credit),
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      });
    }

    for (const row of periodRows) {
      const existing = accountMap.get(row.account_code);
      if (existing) {
        existing.periodDebit = Number(row.total_debit);
        existing.periodCredit = Number(row.total_credit);
      } else {
        accountMap.set(row.account_code, {
          accountCode: row.account_code,
          accountName: row.account_name,
          accountNameAr: row.account_name_ar,
          accountType: row.account_type,
          accountCategory: row.account_category,
          openingDebit: 0,
          openingCredit: 0,
          periodDebit: Number(row.total_debit),
          periodCredit: Number(row.total_credit),
          closingDebit: 0,
          closingCredit: 0,
        });
      }
    }

    // Compute closing balances
    const rows: TrialBalanceRow[] = [];
    for (const row of accountMap.values()) {
      const openingBalance = row.openingDebit - row.openingCredit;
      const periodBalance = row.periodDebit - row.periodCredit;
      const closingBalance = openingBalance + periodBalance;

      row.closingDebit = closingBalance > 0 ? closingBalance : 0;
      row.closingCredit = closingBalance < 0 ? Math.abs(closingBalance) : 0;

      // Adjust opening to debit/credit columns
      const ob = row.openingDebit - row.openingCredit;
      row.openingDebit = ob > 0 ? ob : 0;
      row.openingCredit = ob < 0 ? Math.abs(ob) : 0;

      rows.push(row);
    }

    // Sort by account code
    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    const totals = rows.reduce((acc, r) => ({
      openingDebit: acc.openingDebit + r.openingDebit,
      openingCredit: acc.openingCredit + r.openingCredit,
      periodDebit: acc.periodDebit + r.periodDebit,
      periodCredit: acc.periodCredit + r.periodCredit,
      closingDebit: acc.closingDebit + r.closingDebit,
      closingCredit: acc.closingCredit + r.closingCredit,
    }), { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0, closingDebit: 0, closingCredit: 0 });

    return {
      fromDate, toDate, rows, totals,
      isBalanced: Math.abs(totals.periodDebit - totals.periodCredit) < 0.01,
    };
  }

  // ============================================
  // INCOME STATEMENT (P&L)
  // ============================================

  async getIncomeStatement(fromDate: string, toDate: string): Promise<IncomeStatementReport> {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT je.account_code, coa.account_name, coa.account_type, coa.account_category,
             coa.display_order,
             COALESCE(SUM(je.debit), 0) as total_debit,
             COALESCE(SUM(je.credit), 0) as total_credit
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE je.entry_date BETWEEN ? AND ?
        AND coa.account_type IN ('revenue', 'expense')
      GROUP BY je.account_code, coa.account_name, coa.account_type, coa.account_category, coa.display_order
      ORDER BY coa.display_order, je.account_code
    `, fromDate, toDate);

    // Group by category
    const revenueMap = new Map<string, any[]>();
    const costOfSalesMap = new Map<string, any[]>();
    const opExpenseMap = new Map<string, any[]>();
    let otherIncome = 0;
    let otherExpenses = 0;

    for (const row of rows) {
      const amount = row.account_type === 'revenue'
        ? Number(row.total_credit) - Number(row.total_debit)
        : Number(row.total_debit) - Number(row.total_credit);

      const entry = {
        accountCode: row.account_code,
        accountName: row.account_name,
        amount,
        percentOfRevenue: 0, // computed later
      };

      const category = row.account_category || 'Other';

      if (row.account_type === 'revenue') {
        if (category === 'Other Income') {
          otherIncome += amount;
        } else {
          const arr = revenueMap.get(category) || [];
          arr.push(entry);
          revenueMap.set(category, arr);
        }
      } else {
        if (category === 'Cost of Sales') {
          const arr = costOfSalesMap.get(category) || [];
          arr.push(entry);
          costOfSalesMap.set(category, arr);
        } else if (category === 'Other Expenses') {
          otherExpenses += amount;
        } else {
          const arr = opExpenseMap.get(category) || [];
          arr.push(entry);
          opExpenseMap.set(category, arr);
        }
      }
    }

    const buildSections = (map: Map<string, any[]>): IncomeStatementSection[] => {
      return Array.from(map.entries()).map(([category, accounts]) => ({
        category,
        accounts,
        subtotal: accounts.reduce((s, a) => s + a.amount, 0),
      }));
    };

    const revenue = buildSections(revenueMap);
    const totalRevenue = revenue.reduce((s, sec) => s + sec.subtotal, 0) + otherIncome;
    const costOfSales = buildSections(costOfSalesMap);
    const totalCostOfSales = costOfSales.reduce((s, sec) => s + sec.subtotal, 0);
    const grossProfit = totalRevenue - otherIncome - totalCostOfSales;
    const operatingExpenses = buildSections(opExpenseMap);
    const totalOperatingExpenses = operatingExpenses.reduce((s, sec) => s + sec.subtotal, 0);
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const netProfit = operatingProfit + otherIncome - otherExpenses;

    // Compute percentages
    const setPercent = (sections: IncomeStatementSection[]) => {
      for (const sec of sections) {
        for (const acct of sec.accounts) {
          acct.percentOfRevenue = totalRevenue > 0 ? (acct.amount / totalRevenue) * 100 : 0;
        }
      }
    };
    setPercent(revenue);
    setPercent(costOfSales);
    setPercent(operatingExpenses);

    return {
      fromDate, toDate,
      revenue, totalRevenue: totalRevenue - otherIncome,
      costOfSales, totalCostOfSales,
      grossProfit,
      operatingExpenses, totalOperatingExpenses,
      operatingProfit,
      otherIncome, otherExpenses,
      netProfit,
    };
  }

  // ============================================
  // BALANCE SHEET
  // ============================================

  async getBalanceSheet(asOfDate: string): Promise<BalanceSheetReport> {
    // All entries up to asOfDate
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT je.account_code, coa.account_name, coa.account_type, coa.account_category,
             coa.display_order,
             COALESCE(SUM(je.debit), 0) as total_debit,
             COALESCE(SUM(je.credit), 0) as total_credit
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE je.entry_date <= ?
      GROUP BY je.account_code, coa.account_name, coa.account_type, coa.account_category, coa.display_order
      ORDER BY coa.display_order, je.account_code
    `, asOfDate);

    const assetsMap = new Map<string, any[]>();
    const liabilitiesMap = new Map<string, any[]>();
    const equityMap = new Map<string, any[]>();
    let revenueTotal = 0;
    let expenseTotal = 0;

    for (const row of rows) {
      const debit = Number(row.total_debit);
      const credit = Number(row.total_credit);
      const category = row.account_category || 'Other';

      if (row.account_type === 'asset') {
        const balance = debit - credit;
        const arr = assetsMap.get(category) || [];
        arr.push({ accountCode: row.account_code, accountName: row.account_name, balance });
        assetsMap.set(category, arr);
      } else if (row.account_type === 'liability') {
        const balance = credit - debit;
        const arr = liabilitiesMap.get(category) || [];
        arr.push({ accountCode: row.account_code, accountName: row.account_name, balance });
        liabilitiesMap.set(category, arr);
      } else if (row.account_type === 'equity') {
        const balance = credit - debit;
        const arr = equityMap.get(category) || [];
        arr.push({ accountCode: row.account_code, accountName: row.account_name, balance });
        equityMap.set(category, arr);
      } else if (row.account_type === 'revenue') {
        revenueTotal += credit - debit;
      } else if (row.account_type === 'expense') {
        expenseTotal += debit - credit;
      }
    }

    const buildSections = (map: Map<string, any[]>): BalanceSheetSection[] => {
      return Array.from(map.entries()).map(([category, accounts]) => ({
        category,
        accounts,
        subtotal: accounts.reduce((s, a) => s + a.balance, 0),
      }));
    };

    const assets = buildSections(assetsMap);
    const totalAssets = assets.reduce((s, sec) => s + sec.subtotal, 0);
    const liabilities = buildSections(liabilitiesMap);
    const totalLiabilities = liabilities.reduce((s, sec) => s + sec.subtotal, 0);
    const equity = buildSections(equityMap);
    const totalEquity = equity.reduce((s, sec) => s + sec.subtotal, 0);
    const netProfit = revenueTotal - expenseTotal;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netProfit;

    return {
      asOfDate, assets, totalAssets,
      liabilities, totalLiabilities,
      equity, totalEquity,
      netProfit,
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
    };
  }

  // ============================================
  // VAT REPORT
  // ============================================

  async getVatReport(fromDate: string, toDate: string): Promise<VatReport> {
    // Output VAT (from customer invoices)
    const outputRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT cil.vat_rate,
             SUM(cil.total_ht) as taxable_base,
             SUM(cil.total_tva) as vat_amount,
             COUNT(DISTINCT cil.invoice_dolibarr_id) as tx_count
      FROM fin_customer_invoice_lines cil
      JOIN fin_customer_invoices ci ON ci.dolibarr_id = cil.invoice_dolibarr_id
      WHERE ci.date_invoice BETWEEN ? AND ?
        AND ci.status >= 1 AND ci.is_active = 1
      GROUP BY cil.vat_rate
      ORDER BY cil.vat_rate DESC
    `, fromDate, toDate);

    // Input VAT (from supplier invoices)
    const inputRows: any[] = await prisma.$queryRawUnsafe(`
      SELECT sil.vat_rate,
             SUM(sil.total_ht) as taxable_base,
             SUM(sil.total_tva) as vat_amount,
             COUNT(DISTINCT sil.invoice_dolibarr_id) as tx_count
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      WHERE si.date_invoice BETWEEN ? AND ?
        AND si.status >= 1 AND si.is_active = 1
      GROUP BY sil.vat_rate
      ORDER BY sil.vat_rate DESC
    `, fromDate, toDate);

    const outputVat: VatReportLine[] = outputRows.map(r => ({
      vatRate: Number(r.vat_rate),
      taxableBase: Number(r.taxable_base),
      vatAmount: Number(r.vat_amount),
      transactionCount: Number(r.tx_count),
    }));

    const inputVat: VatReportLine[] = inputRows.map(r => ({
      vatRate: Number(r.vat_rate),
      taxableBase: Number(r.taxable_base),
      vatAmount: Number(r.vat_amount),
      transactionCount: Number(r.tx_count),
    }));

    const totalOutputVat = outputVat.reduce((s, r) => s + r.vatAmount, 0);
    const totalInputVat = inputVat.reduce((s, r) => s + r.vatAmount, 0);

    return {
      fromDate, toDate,
      outputVat, totalOutputVat,
      inputVat, totalInputVat,
      netVatPayable: totalOutputVat - totalInputVat,
    };
  }

  // ============================================
  // AGING REPORT (AR / AP)
  // ============================================

  async getAgingReport(type: 'ar' | 'ap', asOfDate: string): Promise<AgingReport> {
    const asOf = new Date(asOfDate);

    const table = type === 'ar' ? 'fin_customer_invoices' : 'fin_supplier_invoices';
    const refField = type === 'ar' ? 'ref_client' : 'ref_supplier';

    // Get unpaid invoices
    const invoices: any[] = await prisma.$queryRawUnsafe(`
      SELECT inv.dolibarr_id, inv.ref, inv.socid, inv.total_ttc, inv.date_invoice, inv.date_due,
             COALESCE(dt.name, CONCAT('Third Party #', inv.socid)) as thirdparty_name,
             COALESCE((SELECT SUM(fp.amount) FROM fin_payments fp
                       WHERE fp.invoice_dolibarr_id = inv.dolibarr_id
                         AND fp.payment_type = ?), 0) as amount_paid
      FROM ${table} inv
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = inv.socid
      WHERE inv.is_active = 1 AND inv.status >= 1 AND inv.is_paid = 0
        AND inv.date_invoice <= ?
      ORDER BY dt.name, inv.date_due
    `, type === 'ar' ? 'customer' : 'supplier', asOfDate);

    // Group by third party
    const thirdpartyMap = new Map<number, AgingRow>();

    for (const inv of invoices) {
      const totalTtc = Number(inv.total_ttc);
      const amountPaid = Number(inv.amount_paid);
      const remaining = totalTtc - amountPaid;
      if (remaining <= 0.01) continue; // fully paid

      const dueDate = inv.date_due ? new Date(inv.date_due) : new Date(inv.date_invoice);
      const daysOverdue = Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      let ageBucket: string;
      if (daysOverdue <= 0) ageBucket = 'current';
      else if (daysOverdue <= 30) ageBucket = '1-30';
      else if (daysOverdue <= 60) ageBucket = '31-60';
      else if (daysOverdue <= 90) ageBucket = '61-90';
      else ageBucket = '90+';

      const socid = Number(inv.socid);
      if (!thirdpartyMap.has(socid)) {
        thirdpartyMap.set(socid, {
          thirdpartyId: socid,
          thirdpartyName: inv.thirdparty_name,
          invoices: [],
          buckets: { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 },
        });
      }

      const row = thirdpartyMap.get(socid)!;
      // Calculate payment terms in days from invoice date to due date
      const invoiceDate = inv.date_invoice ? new Date(inv.date_invoice) : null;
      const dueDateObj = inv.date_due ? new Date(inv.date_due) : null;
      let paymentTermsDays = 0;
      let paymentTermsLabel = 'N/A';
      if (invoiceDate && dueDateObj) {
        paymentTermsDays = Math.round((dueDateObj.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        if (paymentTermsDays <= 0) paymentTermsLabel = 'Due on Receipt';
        else if (paymentTermsDays <= 15) paymentTermsLabel = `Net ${paymentTermsDays}`;
        else if (paymentTermsDays <= 35) paymentTermsLabel = 'Net 30';
        else if (paymentTermsDays <= 50) paymentTermsLabel = 'Net 45';
        else if (paymentTermsDays <= 65) paymentTermsLabel = 'Net 60';
        else if (paymentTermsDays <= 95) paymentTermsLabel = 'Net 90';
        else paymentTermsLabel = `Net ${paymentTermsDays}`;
      }

      row.invoices.push({
        ref: inv.ref,
        dateInvoice: inv.date_invoice ? new Date(inv.date_invoice).toISOString().slice(0, 10) : '',
        dateDue: inv.date_due ? new Date(inv.date_due).toISOString().slice(0, 10) : '',
        totalAmount: totalTtc,
        amountPaid,
        remaining,
        ageBucket,
        daysOverdue: Math.max(0, daysOverdue),
        paymentTermsDays,
        paymentTermsLabel,
      });

      row.buckets.total += remaining;
      if (ageBucket === 'current') row.buckets.current += remaining;
      else if (ageBucket === '1-30') row.buckets.days1to30 += remaining;
      else if (ageBucket === '31-60') row.buckets.days31to60 += remaining;
      else if (ageBucket === '61-90') row.buckets.days61to90 += remaining;
      else row.buckets.days90plus += remaining;
    }

    const rows = Array.from(thirdpartyMap.values());
    const totals: AgingBucket = rows.reduce((acc, r) => ({
      current: acc.current + r.buckets.current,
      days1to30: acc.days1to30 + r.buckets.days1to30,
      days31to60: acc.days31to60 + r.buckets.days31to60,
      days61to90: acc.days61to90 + r.buckets.days61to90,
      days90plus: acc.days90plus + r.buckets.days90plus,
      total: acc.total + r.buckets.total,
    }), { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 });

    return { type, asOfDate, rows, totals };
  }

  // ============================================
  // DASHBOARD SUMMARY (Enhanced)
  // ============================================

  async getDashboardSummary(fromDate: string, toDate: string): Promise<any> {
    let totalRevenue = 0, totalExpenses = 0, totalAR = 0, totalAP = 0;
    let vatOutputTotal = 0, vatInputTotal = 0;
    let costOfSales = 0, salariesExpense = 0;
    let totalAssets = 0, totalEquity = 0;

    try {
      const revRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(je.credit) - SUM(je.debit), 0) as total
        FROM fin_journal_entries je
        JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
        WHERE coa.account_type = 'revenue' AND je.entry_date BETWEEN ? AND ?
      `, fromDate, toDate);
      totalRevenue = Number(revRows[0]?.total || 0);
    } catch { /* */ }

    try {
      const expRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(je.debit) - SUM(je.credit), 0) as total
        FROM fin_journal_entries je
        JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
        WHERE coa.account_type = 'expense' AND je.entry_date BETWEEN ? AND ?
      `, fromDate, toDate);
      totalExpenses = Number(expRows[0]?.total || 0);
    } catch { /* */ }

    // Cost of Sales (COGS) for gross margin
    try {
      const cogsRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(je.debit) - SUM(je.credit), 0) as total
        FROM fin_journal_entries je
        JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
        WHERE coa.account_type = 'expense' AND coa.account_category = 'Cost of Sales'
          AND je.entry_date BETWEEN ? AND ?
      `, fromDate, toDate);
      costOfSales = Number(cogsRows[0]?.total || 0);
    } catch { /* */ }

    // Salaries expense - match Dolibarr CoA codes: 4102 (Salaries), 4103 (Allowances), 42001 (Operational Salaries)
    try {
      const salRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(je.debit) - SUM(je.credit), 0) as total
        FROM fin_journal_entries je
        JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
        WHERE coa.account_type = 'expense'
          AND (coa.account_code LIKE '4102%' OR coa.account_code LIKE '4103%' OR coa.account_code LIKE '42001%'
               OR coa.account_code LIKE '4115%' OR coa.account_code LIKE '4118%'
               OR coa.account_code LIKE '620%' OR coa.account_code LIKE '631%'
               OR coa.account_name LIKE '%Salar%' OR coa.account_name LIKE '%Wage%'
               OR coa.account_name LIKE '%Allowance%' OR coa.account_name LIKE '%Bonus%'
               OR coa.account_name LIKE '%رواتب%' OR coa.account_name LIKE '%بدل%')
          AND je.entry_date BETWEEN ? AND ?
      `, fromDate, toDate);
      salariesExpense = Number(salRows[0]?.total || 0);
    } catch { /* */ }

    // Total Assets (for ROA)
    try {
      const assetRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(je.debit) - SUM(je.credit), 0) as total
        FROM fin_journal_entries je
        JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
        WHERE coa.account_type = 'asset' AND je.entry_date <= ?
      `, toDate);
      totalAssets = Number(assetRows[0]?.total || 0);
    } catch { /* */ }

    // Total Equity (for ROE)
    try {
      const eqRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(je.credit) - SUM(je.debit), 0) as total
        FROM fin_journal_entries je
        JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
        WHERE coa.account_type = 'equity' AND je.entry_date <= ?
      `, toDate);
      totalEquity = Number(eqRows[0]?.total || 0);
    } catch { /* */ }

    // VAT Output (collected on sales)
    try {
      const vatOutRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(cil.total_tva), 0) as total
        FROM fin_customer_invoice_lines cil
        JOIN fin_customer_invoices ci ON ci.dolibarr_id = cil.invoice_dolibarr_id
        WHERE ci.date_invoice BETWEEN ? AND ?
          AND ci.status >= 1 AND ci.is_active = 1
      `, fromDate, toDate);
      vatOutputTotal = Number(vatOutRows[0]?.total || 0);
    } catch { /* */ }

    // VAT Input (paid on purchases)
    try {
      const vatInRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(sil.total_tva), 0) as total
        FROM fin_supplier_invoice_lines sil
        JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
        WHERE si.date_invoice BETWEEN ? AND ?
          AND si.status >= 1 AND si.is_active = 1
      `, fromDate, toDate);
      vatInputTotal = Number(vatInRows[0]?.total || 0);
    } catch { /* */ }

    // AR: Per-invoice remaining = total_ttc - sum(payments for that invoice)
    try {
      const arRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(ci.total_ttc - COALESCE(p.paid, 0)), 0) as total_ar
        FROM fin_customer_invoices ci
        LEFT JOIN (
          SELECT invoice_dolibarr_id, SUM(amount) as paid
          FROM fin_payments WHERE payment_type = 'customer'
          GROUP BY invoice_dolibarr_id
        ) p ON p.invoice_dolibarr_id = ci.dolibarr_id
        WHERE ci.is_active = 1 AND ci.status >= 1
          AND (ci.is_paid = 0 OR ci.total_ttc > COALESCE(p.paid, 0) + 0.01)
      `);
      totalAR = Math.max(0, Number(arRows[0]?.total_ar || 0));
    } catch { /* */ }

    // AP: Per-invoice remaining = total_ttc - sum(payments for that invoice)
    try {
      const apRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(si.total_ttc - COALESCE(p.paid, 0)), 0) as total_ap
        FROM fin_supplier_invoices si
        LEFT JOIN (
          SELECT invoice_dolibarr_id, SUM(amount) as paid
          FROM fin_payments WHERE payment_type = 'supplier'
          GROUP BY invoice_dolibarr_id
        ) p ON p.invoice_dolibarr_id = si.dolibarr_id
        WHERE si.is_active = 1 AND si.status >= 1
          AND (si.is_paid = 0 OR si.total_ttc > COALESCE(p.paid, 0) + 0.01)
      `);
      totalAP = Math.max(0, Number(apRows[0]?.total_ap || 0));
    } catch { /* */ }

    // Bank balances
    let bankAccounts: any[] = [];
    try {
      bankAccounts = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id, ref, label, bank_name, balance, currency_code, is_open FROM fin_bank_accounts ORDER BY label`
      );
    } catch { /* */ }

    const netProfit = totalRevenue - totalExpenses;
    const grossProfit = totalRevenue - costOfSales;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const roaPct = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
    const roePct = totalEquity > 0 ? (netProfit / totalEquity) * 100 : 0;

    return {
      period: { from: fromDate, to: toDate },
      totalRevenue,
      totalExpenses,
      netProfit,
      costOfSales,
      grossProfit,
      grossMarginPct,
      netMarginPct,
      roaPct,
      roePct,
      totalAssets,
      totalEquity,
      salariesExpense,
      vatOutputTotal,
      vatInputTotal,
      netVatPayable: vatOutputTotal - vatInputTotal,
      totalAR,
      totalAP,
      bankAccounts: bankAccounts.map((b: any) => ({
        id: b.dolibarr_id,
        ref: b.ref,
        label: b.label,
        bankName: b.bank_name,
        balance: Number(b.balance),
        currency: b.currency_code,
        isOpen: b.is_open === 1,
      })),
    };
  }

  // ============================================
  // STATEMENT OF ACCOUNT (SOA)
  // ============================================

  async getStatementOfAccount(thirdpartyId: number, type: 'ar' | 'ap', fromDate: string, toDate: string): Promise<any> {
    const table = type === 'ar' ? 'fin_customer_invoices' : 'fin_supplier_invoices';

    const invoices: any[] = await prisma.$queryRawUnsafe(`
      SELECT inv.dolibarr_id, inv.ref, inv.total_ht, inv.total_tva, inv.total_ttc,
             inv.date_invoice, inv.date_due, inv.is_paid, inv.type,
             COALESCE(dt.name, CONCAT('Third Party #', inv.socid)) as thirdparty_name
      FROM ${table} inv
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = inv.socid
      WHERE inv.socid = ? AND inv.is_active = 1 AND inv.status >= 1
        AND inv.date_invoice BETWEEN ? AND ?
      ORDER BY inv.date_invoice ASC
    `, thirdpartyId, fromDate, toDate);

    const payments: any[] = await prisma.$queryRawUnsafe(`
      SELECT fp.invoice_dolibarr_id, fp.amount, fp.payment_date, fp.payment_method, fp.dolibarr_ref
      FROM fin_payments fp
      WHERE fp.payment_type = ? AND fp.invoice_dolibarr_id IN (
        SELECT dolibarr_id FROM ${table} WHERE socid = ? AND is_active = 1 AND status >= 1
          AND date_invoice BETWEEN ? AND ?
      )
      ORDER BY fp.payment_date ASC
    `, type === 'ar' ? 'customer' : 'supplier', thirdpartyId, fromDate, toDate);

    const paymentsByInvoice = new Map<number, any[]>();
    for (const p of payments) {
      const id = Number(p.invoice_dolibarr_id);
      if (!paymentsByInvoice.has(id)) paymentsByInvoice.set(id, []);
      paymentsByInvoice.get(id)!.push({
        amount: Number(p.amount),
        date: p.payment_date ? new Date(p.payment_date).toISOString().slice(0, 10) : '',
        method: p.payment_method,
        ref: p.dolibarr_ref,
      });
    }

    let runningBalance = 0;
    const lines: any[] = [];
    const thirdpartyName = invoices[0]?.thirdparty_name || `Third Party #${thirdpartyId}`;

    for (const inv of invoices) {
      const totalTtc = Number(inv.total_ttc);
      const invPayments = paymentsByInvoice.get(Number(inv.dolibarr_id)) || [];
      const totalPaid = invPayments.reduce((s: number, p: any) => s + p.amount, 0);

      runningBalance += totalTtc;
      lines.push({
        date: inv.date_invoice ? new Date(inv.date_invoice).toISOString().slice(0, 10) : '',
        ref: inv.ref,
        type: inv.type === 2 ? 'Credit Note' : 'Invoice',
        debit: type === 'ar' ? totalTtc : 0,
        credit: type === 'ar' ? 0 : totalTtc,
        balance: runningBalance,
      });

      for (const p of invPayments) {
        runningBalance -= p.amount;
        lines.push({
          date: p.date,
          ref: p.ref || `Payment for ${inv.ref}`,
          type: 'Payment',
          debit: type === 'ar' ? 0 : p.amount,
          credit: type === 'ar' ? p.amount : 0,
          balance: runningBalance,
        });
      }
    }

    const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.total_ttc), 0);
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);

    return {
      thirdpartyId,
      thirdpartyName,
      type,
      fromDate,
      toDate,
      lines,
      totalInvoiced,
      totalPaid,
      balance: totalInvoiced - totalPaid,
    };
  }

  // ============================================
  // MONTHLY CASH IN / CASH OUT
  // ============================================

  async getMonthlyCashFlow(year: number): Promise<any> {
    const months: any[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthStart = `${year}-${String(m).padStart(2, '0')}-01`;
      const monthEnd = m === 12
        ? `${year}-12-31`
        : `${year}-${String(m + 1).padStart(2, '0')}-01`;

      let cashIn = 0, cashOut = 0;

      try {
        const inRows: any[] = await prisma.$queryRawUnsafe(`
          SELECT COALESCE(SUM(fp.amount), 0) as total
          FROM fin_payments fp
          WHERE fp.payment_type = 'customer'
            AND fp.payment_date >= ? AND fp.payment_date < ?
        `, monthStart, monthEnd);
        cashIn = Number(inRows[0]?.total || 0);
      } catch { /* */ }

      try {
        const outRows: any[] = await prisma.$queryRawUnsafe(`
          SELECT COALESCE(SUM(fp.amount), 0) as total
          FROM fin_payments fp
          WHERE fp.payment_type = 'supplier'
            AND fp.payment_date >= ? AND fp.payment_date < ?
        `, monthStart, monthEnd);
        cashOut = Number(outRows[0]?.total || 0);
      } catch { /* */ }

      // Fallback 1: derive from journal entries (supplier payment entries credit AP account)
      if (cashOut === 0) {
        try {
          const jeRows: any[] = await prisma.$queryRawUnsafe(`
            SELECT COALESCE(SUM(je.debit), 0) as total
            FROM fin_journal_entries je
            WHERE je.source_type = 'supplier_payment'
              AND je.journal_code = 'BQ'
              AND je.entry_date >= ? AND je.entry_date < ?
          `, monthStart, monthEnd);
          cashOut = Number(jeRows[0]?.total || 0);
        } catch { /* */ }
      }

      // Fallback 2: derive from paid supplier invoices by invoice date
      if (cashOut === 0) {
        try {
          const fallbackRows: any[] = await prisma.$queryRawUnsafe(`
            SELECT COALESCE(SUM(si.total_ttc), 0) as total
            FROM fin_supplier_invoices si
            WHERE si.is_active = 1 AND si.status >= 1 AND si.is_paid = 1
              AND si.date_invoice >= ? AND si.date_invoice < ?
          `, monthStart, monthEnd);
          cashOut = Number(fallbackRows[0]?.total || 0);
        } catch { /* */ }
      }

      months.push({
        month: m,
        monthName: new Date(year, m - 1, 1).toLocaleString('en', { month: 'short' }),
        cashIn,
        cashOut,
        net: cashIn - cashOut,
      });
    }

    const totalCashIn = months.reduce((s, m) => s + m.cashIn, 0);
    const totalCashOut = months.reduce((s, m) => s + m.cashOut, 0);

    return {
      year,
      months,
      totalCashIn,
      totalCashOut,
      totalNet: totalCashIn - totalCashOut,
    };
  }

  // ============================================
  // CASH FLOW FORECAST (13-week rolling)
  // ============================================

  async getCashFlowForecast(): Promise<any> {
    const today = new Date();
    const weeks: any[] = [];

    // Get current bank balance as starting point
    let openingBalance = 0;
    try {
      const bankRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(balance), 0) as total FROM fin_bank_accounts WHERE is_open = 1`
      );
      openingBalance = Number(bankRows[0]?.total || 0);
    } catch { /* */ }

    let runningBalance = openingBalance;

    for (let w = 0; w < 13; w++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (w * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const wsStr = weekStart.toISOString().slice(0, 10);
      const weStr = weekEnd.toISOString().slice(0, 10);

      // Expected collections: customer invoices due this week
      let expectedCollections = 0;
      try {
        const collRows: any[] = await prisma.$queryRawUnsafe(`
          SELECT COALESCE(SUM(ci.total_ttc - COALESCE(p.paid, 0)), 0) as total
          FROM fin_customer_invoices ci
          LEFT JOIN (
            SELECT invoice_dolibarr_id, SUM(amount) as paid
            FROM fin_payments WHERE payment_type = 'customer'
            GROUP BY invoice_dolibarr_id
          ) p ON p.invoice_dolibarr_id = ci.dolibarr_id
          WHERE ci.is_active = 1 AND ci.status >= 1 AND ci.is_paid = 0
            AND ci.date_due BETWEEN ? AND ?
        `, wsStr, weStr);
        expectedCollections = Number(collRows[0]?.total || 0);
      } catch { /* */ }

      // Expected payments: supplier invoices due this week
      let expectedPayments = 0;
      try {
        const payRows: any[] = await prisma.$queryRawUnsafe(`
          SELECT COALESCE(SUM(si.total_ttc - COALESCE(p.paid, 0)), 0) as total
          FROM fin_supplier_invoices si
          LEFT JOIN (
            SELECT invoice_dolibarr_id, SUM(amount) as paid
            FROM fin_payments WHERE payment_type = 'supplier'
            GROUP BY invoice_dolibarr_id
          ) p ON p.invoice_dolibarr_id = si.dolibarr_id
          WHERE si.is_active = 1 AND si.status >= 1 AND si.is_paid = 0
            AND si.date_due BETWEEN ? AND ?
        `, wsStr, weStr);
        expectedPayments = Number(payRows[0]?.total || 0);
      } catch { /* */ }

      const netFlow = expectedCollections - expectedPayments;
      runningBalance += netFlow;

      weeks.push({
        week: w + 1,
        weekStart: wsStr,
        weekEnd: weStr,
        expectedCollections,
        expectedPayments,
        netFlow,
        projectedBalance: runningBalance,
      });
    }

    return {
      generatedAt: today.toISOString(),
      openingBalance,
      weeks,
    };
  }

  // ============================================
  // PROJECT PROFITABILITY (P&L by project)
  // ============================================

  async getProjectProfitability(): Promise<any> {
    // Get all projects with their financial data from invoices
    const projects: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        dt.dolibarr_id as thirdparty_id,
        dt.name as client_name,
        COALESCE(SUM(ci.total_ht), 0) as total_invoiced_ht,
        COALESCE(SUM(ci.total_ttc), 0) as total_invoiced_ttc,
        COUNT(DISTINCT ci.dolibarr_id) as invoice_count,
        COALESCE(SUM(CASE WHEN ci.is_paid = 1 THEN ci.total_ttc ELSE 0 END), 0) as total_paid_invoices,
        COALESCE(p_sum.total_collected, 0) as total_collected
      FROM fin_customer_invoices ci
      JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = ci.socid
      LEFT JOIN (
        SELECT ci2.socid,
               SUM(fp.amount) as total_collected
        FROM fin_payments fp
        JOIN fin_customer_invoices ci2 ON ci2.dolibarr_id = fp.invoice_dolibarr_id
        WHERE fp.payment_type = 'customer'
        GROUP BY ci2.socid
      ) p_sum ON p_sum.socid = ci.socid
      WHERE ci.is_active = 1 AND ci.status >= 1
      GROUP BY dt.dolibarr_id, dt.name, p_sum.total_collected
      ORDER BY total_invoiced_ttc DESC
    `);

    // Get supplier costs per third party (if linked)
    const supplierCosts: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.socid as supplier_id,
        dt.name as supplier_name,
        COALESCE(SUM(si.total_ht), 0) as total_cost_ht,
        COALESCE(SUM(si.total_ttc), 0) as total_cost_ttc
      FROM fin_supplier_invoices si
      JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      WHERE si.is_active = 1 AND si.status >= 1
      GROUP BY si.socid, dt.name
      ORDER BY total_cost_ttc DESC
    `);

    const totalInvoiced = projects.reduce((s, p) => s + Number(p.total_invoiced_ttc), 0);
    const totalCollected = projects.reduce((s, p) => s + Number(p.total_collected), 0);
    const totalCosts = supplierCosts.reduce((s, c) => s + Number(c.total_cost_ttc), 0);

    return {
      projects: projects.map((p: any) => ({
        clientId: Number(p.thirdparty_id),
        clientName: p.client_name,
        invoicedHT: Number(p.total_invoiced_ht),
        invoicedTTC: Number(p.total_invoiced_ttc),
        invoiceCount: Number(p.invoice_count),
        collected: Number(p.total_collected),
        collectionRate: Number(p.total_invoiced_ttc) > 0
          ? (Number(p.total_collected) / Number(p.total_invoiced_ttc)) * 100 : 0,
        outstanding: Number(p.total_invoiced_ttc) - Number(p.total_collected),
      })),
      supplierCosts: supplierCosts.map((c: any) => ({
        supplierId: Number(c.supplier_id),
        supplierName: c.supplier_name,
        costHT: Number(c.total_cost_ht),
        costTTC: Number(c.total_cost_ttc),
      })),
      summary: {
        totalInvoiced,
        totalCollected,
        totalCosts,
        grossMargin: totalInvoiced - totalCosts,
        grossMarginPct: totalInvoiced > 0 ? ((totalInvoiced - totalCosts) / totalInvoiced) * 100 : 0,
        collectionRate: totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0,
      },
    };
  }

  // ============================================
  // WIP (Work-In-Progress) Report
  // ============================================

  async getWIPReport(): Promise<any> {
    // WIP = Invoiced but not yet collected, or costs incurred but not yet invoiced
    const arAging: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        dt.name as client_name,
        ci.ref,
        ci.date_invoice,
        ci.date_due,
        ci.total_ttc,
        COALESCE(p.paid, 0) as amount_paid,
        (ci.total_ttc - COALESCE(p.paid, 0)) as wip_amount,
        DATEDIFF(CURDATE(), ci.date_invoice) as days_since_invoice
      FROM fin_customer_invoices ci
      LEFT JOIN (
        SELECT invoice_dolibarr_id, SUM(amount) as paid
        FROM fin_payments WHERE payment_type = 'customer'
        GROUP BY invoice_dolibarr_id
      ) p ON p.invoice_dolibarr_id = ci.dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = ci.socid
      WHERE ci.is_active = 1 AND ci.status >= 1
        AND (ci.total_ttc - COALESCE(p.paid, 0)) > 0.01
      ORDER BY ci.date_invoice ASC
    `);

    const apWip: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        dt.name as supplier_name,
        si.ref,
        si.date_invoice,
        si.date_due,
        si.total_ttc,
        COALESCE(p.paid, 0) as amount_paid,
        (si.total_ttc - COALESCE(p.paid, 0)) as wip_amount,
        DATEDIFF(CURDATE(), si.date_invoice) as days_since_invoice
      FROM fin_supplier_invoices si
      LEFT JOIN (
        SELECT invoice_dolibarr_id, SUM(amount) as paid
        FROM fin_payments WHERE payment_type = 'supplier'
        GROUP BY invoice_dolibarr_id
      ) p ON p.invoice_dolibarr_id = si.dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      WHERE si.is_active = 1 AND si.status >= 1
        AND (si.total_ttc - COALESCE(p.paid, 0)) > 0.01
      ORDER BY si.date_invoice ASC
    `);

    const totalARWip = arAging.reduce((s, r) => s + Number(r.wip_amount), 0);
    const totalAPWip = apWip.reduce((s, r) => s + Number(r.wip_amount), 0);

    return {
      receivables: arAging.map((r: any) => ({
        clientName: r.client_name || 'Unknown',
        ref: r.ref,
        dateInvoice: r.date_invoice ? new Date(r.date_invoice).toISOString().slice(0, 10) : '',
        dateDue: r.date_due ? new Date(r.date_due).toISOString().slice(0, 10) : '',
        totalAmount: Number(r.total_ttc),
        amountPaid: Number(r.amount_paid),
        wipAmount: Number(r.wip_amount),
        daysSinceInvoice: Number(r.days_since_invoice),
      })),
      payables: apWip.map((r: any) => ({
        supplierName: r.supplier_name || 'Unknown',
        ref: r.ref,
        dateInvoice: r.date_invoice ? new Date(r.date_invoice).toISOString().slice(0, 10) : '',
        dateDue: r.date_due ? new Date(r.date_due).toISOString().slice(0, 10) : '',
        totalAmount: Number(r.total_ttc),
        amountPaid: Number(r.amount_paid),
        wipAmount: Number(r.wip_amount),
        daysSinceInvoice: Number(r.days_since_invoice),
      })),
      totalARWip,
      totalAPWip,
      netWip: totalARWip - totalAPWip,
    };
  }

  // ============================================
  // PROJECTS FINANCIAL DASHBOARD
  // ============================================

  async getProjectsFinancialDashboard(): Promise<any> {
    const projects: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        dt.dolibarr_id as client_id,
        dt.name as client_name,
        COUNT(DISTINCT ci.dolibarr_id) as total_invoices,
        COALESCE(SUM(ci.total_ht), 0) as total_invoiced_ht,
        COALESCE(SUM(ci.total_ttc), 0) as total_invoiced_ttc,
        COALESCE(SUM(ci.total_tva), 0) as total_vat,
        COALESCE(coll.total_collected, 0) as total_collected,
        COALESCE(SUM(CASE WHEN ci.is_paid = 0 THEN ci.total_ttc ELSE 0 END), 0) as total_outstanding
      FROM fin_customer_invoices ci
      JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = ci.socid
      LEFT JOIN (
        SELECT ci2.socid, SUM(fp.amount) as total_collected
        FROM fin_payments fp
        JOIN fin_customer_invoices ci2 ON ci2.dolibarr_id = fp.invoice_dolibarr_id
        WHERE fp.payment_type = 'customer'
        GROUP BY ci2.socid
      ) coll ON coll.socid = ci.socid
      WHERE ci.is_active = 1 AND ci.status >= 1
      GROUP BY dt.dolibarr_id, dt.name, coll.total_collected
      ORDER BY total_invoiced_ttc DESC
    `);

    // Total supplier costs
    let totalSupplierCosts = 0;
    try {
      const costRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(total_ht), 0) as total
        FROM fin_supplier_invoices WHERE is_active = 1 AND status >= 1
      `);
      totalSupplierCosts = Number(costRows[0]?.total || 0);
    } catch { /* */ }

    const totalProjects = projects.length;
    const totalInvoiced = projects.reduce((s, p) => s + Number(p.total_invoiced_ttc), 0);
    const totalCollected = projects.reduce((s, p) => s + Number(p.total_collected), 0);
    const totalOutstanding = projects.reduce((s, p) => s + Number(p.total_outstanding), 0);
    const grossMargin = totalInvoiced - totalSupplierCosts;

    return {
      totalProjects,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalSupplierCosts,
      grossMargin,
      grossMarginPct: totalInvoiced > 0 ? (grossMargin / totalInvoiced) * 100 : 0,
      collectionRate: totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0,
      projects: projects.map((p: any) => ({
        clientId: Number(p.client_id),
        clientName: p.client_name,
        totalInvoices: Number(p.total_invoices),
        invoicedHT: Number(p.total_invoiced_ht),
        invoicedTTC: Number(p.total_invoiced_ttc),
        vat: Number(p.total_vat),
        collected: Number(p.total_collected),
        outstanding: Number(p.total_outstanding),
        collectionRate: Number(p.total_invoiced_ttc) > 0
          ? (Number(p.total_collected) / Number(p.total_invoiced_ttc)) * 100 : 0,
      })),
    };
  }

  // ============================================
  // CHART OF ACCOUNTS - HIERARCHY VIEW
  // ============================================

  async getCoAHierarchy(): Promise<any> {
    const accounts: any[] = await prisma.$queryRawUnsafe(`
      SELECT coa.account_code, coa.account_name, coa.account_name_ar,
             coa.account_type, coa.account_category, coa.parent_code,
             coa.is_active, coa.display_order,
             COALESCE(SUM(je.debit), 0) as total_debit,
             COALESCE(SUM(je.credit), 0) as total_credit
      FROM fin_chart_of_accounts coa
      LEFT JOIN fin_journal_entries je ON je.account_code = coa.account_code
      WHERE coa.is_active = 1
      GROUP BY coa.account_code, coa.account_name, coa.account_name_ar,
               coa.account_type, coa.account_category, coa.parent_code,
               coa.is_active, coa.display_order
      ORDER BY coa.display_order, coa.account_code
    `);

    // Build hierarchy by account_type and account_category
    const typeGroups: Record<string, any> = {};

    for (const acct of accounts) {
      const type = acct.account_type;
      const category = acct.account_category || 'Other';
      const debit = Number(acct.total_debit);
      const credit = Number(acct.total_credit);
      const balance = ['asset', 'expense'].includes(type) ? debit - credit : credit - debit;

      if (!typeGroups[type]) {
        typeGroups[type] = { type, categories: {}, totalBalance: 0 };
      }
      if (!typeGroups[type].categories[category]) {
        typeGroups[type].categories[category] = { category, accounts: [], subtotal: 0 };
      }

      typeGroups[type].categories[category].accounts.push({
        accountCode: acct.account_code,
        accountName: acct.account_name,
        accountNameAr: acct.account_name_ar,
        parentCode: acct.parent_code,
        balance,
      });
      typeGroups[type].categories[category].subtotal += balance;
      typeGroups[type].totalBalance += balance;
    }

    // Convert to array
    const hierarchy = Object.values(typeGroups).map((tg: any) => ({
      type: tg.type,
      totalBalance: tg.totalBalance,
      categories: Object.values(tg.categories),
    }));

    return { hierarchy };
  }

  // ============================================
  // PROJECT COST STRUCTURE ANALYSIS
  // ============================================

  async getProjectCostStructure(fromDate: string, toDate: string): Promise<any> {
    // 1. Get all supplier invoice lines with their categories, grouped by supplier (project proxy)
    const linesBySupplier: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.socid as supplier_id,
        dt.name as supplier_name,
        sil.product_label,
        sil.product_ref,
        sil.accounting_code,
        COALESCE(coa.account_category, 'Uncategorized') as cost_category,
        COALESCE(coa.account_name, 'Other Costs') as account_name,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_tva) as total_vat,
        SUM(sil.total_ttc) as total_ttc,
        SUM(sil.qty) as total_qty,
        COUNT(DISTINCT si.dolibarr_id) as invoice_count
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = sil.accounting_code
      WHERE si.is_active = 1 AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
      GROUP BY si.socid, dt.name, sil.product_label, sil.product_ref, sil.accounting_code,
               coa.account_category, coa.account_name
      ORDER BY dt.name, total_ttc DESC
    `, fromDate, toDate);

    // 2. Get cost breakdown by category (aggregate)
    const costByCategory: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(coa.account_category, 
          CASE 
            WHEN sil.product_label LIKE '%raw%' OR sil.product_label LIKE '%material%' OR sil.product_label LIKE '%مواد%' OR sil.product_label LIKE '%خام%' THEN 'Raw Materials'
            WHEN sil.product_label LIKE '%sub%contract%' OR sil.product_label LIKE '%مقاول%' THEN 'Subcontractors'
            WHEN sil.product_label LIKE '%transport%' OR sil.product_label LIKE '%shipping%' OR sil.product_label LIKE '%freight%' OR sil.product_label LIKE '%نقل%' OR sil.product_label LIKE '%شحن%' THEN 'Transportation'
            WHEN sil.product_label LIKE '%labor%' OR sil.product_label LIKE '%wage%' OR sil.product_label LIKE '%عمال%' THEN 'Labor'
            WHEN sil.product_label LIKE '%equip%' OR sil.product_label LIKE '%machine%' OR sil.product_label LIKE '%معد%' THEN 'Equipment'
            WHEN sil.product_label LIKE '%rent%' OR sil.product_label LIKE '%إيجار%' THEN 'Rent & Facilities'
            ELSE 'Other Costs'
          END
        ) as cost_category,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_tva) as total_vat,
        SUM(sil.total_ttc) as total_ttc,
        COUNT(DISTINCT sil.invoice_dolibarr_id) as invoice_count,
        COUNT(*) as line_count
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = sil.accounting_code
      WHERE si.is_active = 1 AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
      GROUP BY cost_category
      ORDER BY total_ttc DESC
    `, fromDate, toDate);

    // 3. Get cost by supplier (top suppliers)
    const costBySupplier: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.socid as supplier_id,
        dt.name as supplier_name,
        SUM(si.total_ht) as total_ht,
        SUM(si.total_tva) as total_vat,
        SUM(si.total_ttc) as total_ttc,
        COUNT(DISTINCT si.dolibarr_id) as invoice_count
      FROM fin_supplier_invoices si
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      WHERE si.is_active = 1 AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
      GROUP BY si.socid, dt.name
      ORDER BY total_ttc DESC
    `, fromDate, toDate);

    // 4. Monthly cost trend
    const monthlyTrend: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        DATE_FORMAT(si.date_invoice, '%Y-%m') as month,
        COALESCE(coa.account_category,
          CASE 
            WHEN sil.product_label LIKE '%raw%' OR sil.product_label LIKE '%material%' OR sil.product_label LIKE '%مواد%' OR sil.product_label LIKE '%خام%' THEN 'Raw Materials'
            WHEN sil.product_label LIKE '%sub%contract%' OR sil.product_label LIKE '%مقاول%' THEN 'Subcontractors'
            WHEN sil.product_label LIKE '%transport%' OR sil.product_label LIKE '%shipping%' OR sil.product_label LIKE '%freight%' OR sil.product_label LIKE '%نقل%' OR sil.product_label LIKE '%شحن%' THEN 'Transportation'
            ELSE 'Other Costs'
          END
        ) as cost_category,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_ttc) as total_ttc
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = sil.accounting_code
      WHERE si.is_active = 1 AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
      GROUP BY month, cost_category
      ORDER BY month, cost_category
    `, fromDate, toDate);

    // 5. Compare with revenue for cost-to-revenue ratio
    let totalRevenue = 0;
    try {
      const revRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(ci.total_ht), 0) as total
        FROM fin_customer_invoices ci
        WHERE ci.is_active = 1 AND ci.status >= 1
          AND ci.date_invoice BETWEEN ? AND ?
      `, fromDate, toDate);
      totalRevenue = Number(revRows[0]?.total || 0);
    } catch { /* */ }

    const grandTotalHT = costByCategory.reduce((s, c) => s + Number(c.total_ht), 0);
    const grandTotalTTC = costByCategory.reduce((s, c) => s + Number(c.total_ttc), 0);
    const grandTotalVAT = costByCategory.reduce((s, c) => s + Number(c.total_vat), 0);

    // Build monthly trend map
    const monthMap = new Map<string, Record<string, number>>();
    for (const row of monthlyTrend) {
      if (!monthMap.has(row.month)) monthMap.set(row.month, {});
      const m = monthMap.get(row.month)!;
      m[row.cost_category] = (m[row.cost_category] || 0) + Number(row.total_ht);
    }
    const allCategories = [...new Set(costByCategory.map(c => c.cost_category))];
    const monthlyData = Array.from(monthMap.entries()).sort().map(([month, cats]) => ({
      month,
      monthLabel: new Date(month + '-01').toLocaleString('en', { month: 'short', year: '2-digit' }),
      categories: cats,
      total: Object.values(cats).reduce((s, v) => s + v, 0),
    }));

    return {
      fromDate,
      toDate,
      summary: {
        totalCostHT: grandTotalHT,
        totalCostTTC: grandTotalTTC,
        totalVAT: grandTotalVAT,
        totalRevenue,
        costToRevenueRatio: totalRevenue > 0 ? (grandTotalHT / totalRevenue) * 100 : 0,
        grossMargin: totalRevenue - grandTotalHT,
        grossMarginPct: totalRevenue > 0 ? ((totalRevenue - grandTotalHT) / totalRevenue) * 100 : 0,
        totalSuppliers: costBySupplier.length,
        totalInvoices: costBySupplier.reduce((s, c) => s + Number(c.invoice_count), 0),
      },
      categories: costByCategory.map((c: any) => ({
        category: c.cost_category,
        totalHT: Number(c.total_ht),
        totalVAT: Number(c.total_vat),
        totalTTC: Number(c.total_ttc),
        invoiceCount: Number(c.invoice_count),
        lineCount: Number(c.line_count),
        percentOfTotal: grandTotalHT > 0 ? (Number(c.total_ht) / grandTotalHT) * 100 : 0,
        percentOfRevenue: totalRevenue > 0 ? (Number(c.total_ht) / totalRevenue) * 100 : 0,
      })),
      suppliers: costBySupplier.map((s: any) => ({
        supplierId: Number(s.supplier_id),
        supplierName: s.supplier_name || 'Unknown',
        totalHT: Number(s.total_ht),
        totalVAT: Number(s.total_vat),
        totalTTC: Number(s.total_ttc),
        invoiceCount: Number(s.invoice_count),
        percentOfTotal: grandTotalHT > 0 ? (Number(s.total_ht) / grandTotalHT) * 100 : 0,
      })),
      monthlyTrend: monthlyData,
      allCategories,
    };
  }

  // ============================================
  // EXPENSES ANALYSIS REPORT
  // ============================================

  async getExpensesAnalysis(fromDate: string, toDate: string): Promise<any> {
    // 1. Expenses from journal entries by account category
    const expensesByCategory: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        coa.account_category as category,
        coa.account_code,
        coa.account_name,
        COALESCE(SUM(je.debit) - SUM(je.credit), 0) as amount
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'expense'
        AND je.entry_date BETWEEN ? AND ?
      GROUP BY coa.account_category, coa.account_code, coa.account_name
      ORDER BY coa.account_category, amount DESC
    `, fromDate, toDate);

    // 2. Supplier expenses breakdown (from supplier invoices)
    const supplierExpenses: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.socid as supplier_id,
        dt.name as supplier_name,
        COALESCE(coa.account_category,
          CASE 
            WHEN sil.product_label LIKE '%raw%' OR sil.product_label LIKE '%material%' OR sil.product_label LIKE '%مواد%' OR sil.product_label LIKE '%خام%' THEN 'Raw Materials'
            WHEN sil.product_label LIKE '%sub%contract%' OR sil.product_label LIKE '%مقاول%' THEN 'Subcontractors'
            WHEN sil.product_label LIKE '%transport%' OR sil.product_label LIKE '%shipping%' OR sil.product_label LIKE '%freight%' OR sil.product_label LIKE '%نقل%' OR sil.product_label LIKE '%شحن%' THEN 'Transportation'
            WHEN sil.product_label LIKE '%labor%' OR sil.product_label LIKE '%wage%' OR sil.product_label LIKE '%عمال%' THEN 'Labor'
            WHEN sil.product_label LIKE '%equip%' OR sil.product_label LIKE '%machine%' OR sil.product_label LIKE '%معد%' THEN 'Equipment'
            WHEN sil.product_label LIKE '%rent%' OR sil.product_label LIKE '%إيجار%' THEN 'Rent & Facilities'
            ELSE 'Other Costs'
          END
        ) as expense_category,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_tva) as total_vat,
        SUM(sil.total_ttc) as total_ttc,
        COUNT(DISTINCT si.dolibarr_id) as invoice_count
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = sil.accounting_code
      WHERE si.is_active = 1 AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
      GROUP BY si.socid, dt.name, expense_category
      ORDER BY total_ttc DESC
    `, fromDate, toDate);

    // 3. Monthly expense trend by category
    const monthlyExpenses: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        DATE_FORMAT(je.entry_date, '%Y-%m') as month,
        coa.account_category as category,
        COALESCE(SUM(je.debit) - SUM(je.credit), 0) as amount
      FROM fin_journal_entries je
      JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
      WHERE coa.account_type = 'expense'
        AND je.entry_date BETWEEN ? AND ?
      GROUP BY month, coa.account_category
      ORDER BY month, coa.account_category
    `, fromDate, toDate);

    // 4. Top expense items from supplier invoice lines
    const topExpenseItems: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        sil.product_label,
        sil.product_ref,
        dt.name as supplier_name,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_ttc) as total_ttc,
        SUM(sil.qty) as total_qty,
        COUNT(DISTINCT sil.invoice_dolibarr_id) as invoice_count
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      WHERE si.is_active = 1 AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
      GROUP BY sil.product_label, sil.product_ref, dt.name
      ORDER BY total_ht DESC
      LIMIT 50
    `, fromDate, toDate);

    // 5. Get revenue for comparison
    let totalRevenue = 0;
    try {
      const revRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(je.credit) - SUM(je.debit), 0) as total
        FROM fin_journal_entries je
        JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
        WHERE coa.account_type = 'revenue' AND je.entry_date BETWEEN ? AND ?
      `, fromDate, toDate);
      totalRevenue = Number(revRows[0]?.total || 0);
    } catch { /* */ }

    // 6. Previous period comparison (same duration before fromDate)
    const fromD = new Date(fromDate);
    const toD = new Date(toDate);
    const durationMs = toD.getTime() - fromD.getTime();
    const prevFrom = new Date(fromD.getTime() - durationMs - 86400000).toISOString().slice(0, 10);
    const prevTo = new Date(fromD.getTime() - 86400000).toISOString().slice(0, 10);

    let prevTotalExpenses = 0;
    try {
      const prevRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(je.debit) - SUM(je.credit), 0) as total
        FROM fin_journal_entries je
        JOIN fin_chart_of_accounts coa ON coa.account_code = je.account_code
        WHERE coa.account_type = 'expense' AND je.entry_date BETWEEN ? AND ?
      `, prevFrom, prevTo);
      prevTotalExpenses = Number(prevRows[0]?.total || 0);
    } catch { /* */ }

    // Build category groups from journal entries
    const categoryMap = new Map<string, { category: string; accounts: any[]; subtotal: number }>();
    for (const row of expensesByCategory) {
      const cat = row.category || 'Uncategorized';
      if (!categoryMap.has(cat)) categoryMap.set(cat, { category: cat, accounts: [], subtotal: 0 });
      const group = categoryMap.get(cat)!;
      const amount = Number(row.amount);
      group.accounts.push({
        accountCode: row.account_code,
        accountName: row.account_name,
        amount,
      });
      group.subtotal += amount;
    }
    const categories = Array.from(categoryMap.values()).sort((a, b) => b.subtotal - a.subtotal);
    const totalExpenses = categories.reduce((s, c) => s + c.subtotal, 0);

    // Add percentages
    for (const cat of categories) {
      (cat as any).percentOfTotal = totalExpenses > 0 ? (cat.subtotal / totalExpenses) * 100 : 0;
      (cat as any).percentOfRevenue = totalRevenue > 0 ? (cat.subtotal / totalRevenue) * 100 : 0;
      for (const acct of cat.accounts) {
        acct.percentOfTotal = totalExpenses > 0 ? (acct.amount / totalExpenses) * 100 : 0;
        acct.percentOfCategory = cat.subtotal > 0 ? (acct.amount / cat.subtotal) * 100 : 0;
      }
    }

    // Build supplier expense summary grouped by category
    const supplierCatMap = new Map<string, { category: string; suppliers: any[]; subtotal: number }>();
    for (const row of supplierExpenses) {
      const cat = row.expense_category || 'Other Costs';
      if (!supplierCatMap.has(cat)) supplierCatMap.set(cat, { category: cat, suppliers: [], subtotal: 0 });
      const group = supplierCatMap.get(cat)!;
      const ht = Number(row.total_ht);
      group.suppliers.push({
        supplierId: Number(row.supplier_id),
        supplierName: row.supplier_name || 'Unknown',
        totalHT: ht,
        totalVAT: Number(row.total_vat),
        totalTTC: Number(row.total_ttc),
        invoiceCount: Number(row.invoice_count),
      });
      group.subtotal += ht;
    }
    const supplierCategories = Array.from(supplierCatMap.values()).sort((a, b) => b.subtotal - a.subtotal);

    // Monthly trend
    const monthTrendMap = new Map<string, Record<string, number>>();
    for (const row of monthlyExpenses) {
      if (!monthTrendMap.has(row.month)) monthTrendMap.set(row.month, {});
      const m = monthTrendMap.get(row.month)!;
      const cat = row.category || 'Uncategorized';
      m[cat] = (m[cat] || 0) + Number(row.amount);
    }
    const allExpenseCategories = [...new Set(categories.map(c => c.category))];
    const monthlyData = Array.from(monthTrendMap.entries()).sort().map(([month, cats]) => ({
      month,
      monthLabel: new Date(month + '-01').toLocaleString('en', { month: 'short', year: '2-digit' }),
      categories: cats,
      total: Object.values(cats).reduce((s, v) => s + v, 0),
    }));

    const changeFromPrevPeriod = prevTotalExpenses > 0
      ? ((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100 : 0;

    return {
      fromDate,
      toDate,
      summary: {
        totalExpenses,
        totalRevenue,
        expenseToRevenueRatio: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
        netProfit: totalRevenue - totalExpenses,
        netMarginPct: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        categoryCount: categories.length,
        prevPeriodExpenses: prevTotalExpenses,
        changeFromPrevPeriod,
        prevPeriod: { from: prevFrom, to: prevTo },
      },
      categories,
      supplierCategories,
      topExpenseItems: topExpenseItems.map((item: any) => ({
        productLabel: item.product_label || 'N/A',
        productRef: item.product_ref || '',
        supplierName: item.supplier_name || 'Unknown',
        totalHT: Number(item.total_ht),
        totalTTC: Number(item.total_ttc),
        totalQty: Number(item.total_qty),
        invoiceCount: Number(item.invoice_count),
        percentOfTotal: totalExpenses > 0 ? (Number(item.total_ht) / totalExpenses) * 100 : 0,
      })),
      monthlyTrend: monthlyData,
      allCategories: allExpenseCategories,
    };
  }

  // ============================================
  // PROJECT ANALYSIS REPORT
  // ============================================

  async getProjectAnalysis(fromDate?: string, toDate?: string, projectId?: number): Promise<any> {
    // 1. Get all projects with client info
    const projects: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        dp.dolibarr_id as project_id,
        dp.ref as project_ref,
        dp.title as project_title,
        dp.description as project_description,
        dp.fk_soc,
        dp.fk_statut,
        dp.budget_amount,
        dp.opp_amount,
        dp.date_start,
        dp.date_end,
        dp.date_close,
        dp.array_options,
        dt.name as client_name
      FROM dolibarr_projects dp
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = dp.fk_soc
      WHERE dp.is_active = 1
      ORDER BY dp.ref
    `);

    // 2. Revenue per project (customer invoices linked via fk_projet)
    const dateFilter = fromDate && toDate
      ? `AND ci.date_invoice BETWEEN '${fromDate}' AND '${toDate}'`
      : '';
    const revByProject: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        ci.fk_projet as project_id,
        SUM(ci.total_ht) as revenue_ht,
        SUM(ci.total_tva) as revenue_vat,
        SUM(ci.total_ttc) as revenue_ttc,
        COUNT(DISTINCT ci.dolibarr_id) as invoice_count,
        SUM(CASE WHEN ci.is_paid = 1 THEN ci.total_ttc ELSE 0 END) as invoiced_paid_ttc,
        SUM(CASE WHEN ci.is_paid = 0 THEN ci.total_ttc ELSE 0 END) as invoiced_unpaid_ttc
      FROM fin_customer_invoices ci
      WHERE ci.is_active = 1 AND ci.status >= 1 AND ci.fk_projet IS NOT NULL AND ci.fk_projet > 0
        ${dateFilter}
      GROUP BY ci.fk_projet
    `);
    const revMap = new Map<number, any>();
    for (const r of revByProject) revMap.set(Number(r.project_id), r);

    // 3. Payments collected per project (via customer invoices)
    const dateFilterPmt = fromDate && toDate
      ? `AND fp.payment_date BETWEEN '${fromDate}' AND '${toDate}'`
      : '';
    const pmtByProject: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        ci.fk_projet as project_id,
        SUM(fp.amount) as total_collected,
        COUNT(DISTINCT fp.id) as payment_count
      FROM fin_payments fp
      JOIN fin_customer_invoices ci ON ci.dolibarr_id = fp.invoice_dolibarr_id
      WHERE fp.payment_type = 'customer' AND ci.fk_projet IS NOT NULL AND ci.fk_projet > 0
        ${dateFilterPmt}
      GROUP BY ci.fk_projet
    `);
    const pmtMap = new Map<number, any>();
    for (const p of pmtByProject) pmtMap.set(Number(p.project_id), p);

    // 4. Costs per project (supplier invoices linked via fk_projet)
    const dateFilterSup = fromDate && toDate
      ? `AND si.date_invoice BETWEEN '${fromDate}' AND '${toDate}'`
      : '';
    const costByProject: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.fk_projet as project_id,
        SUM(si.total_ht) as cost_ht,
        SUM(si.total_tva) as cost_vat,
        SUM(si.total_ttc) as cost_ttc,
        COUNT(DISTINCT si.dolibarr_id) as supplier_invoice_count
      FROM fin_supplier_invoices si
      WHERE si.is_active = 1 AND si.status >= 1 AND si.fk_projet IS NOT NULL AND si.fk_projet > 0
        ${dateFilterSup}
      GROUP BY si.fk_projet
    `);
    const costMap = new Map<number, any>();
    for (const c of costByProject) costMap.set(Number(c.project_id), c);

    // 5. Supplier payments per project
    const suppPmtByProject: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.fk_projet as project_id,
        SUM(fp.amount) as total_paid_to_suppliers,
        COUNT(DISTINCT fp.id) as supplier_payment_count
      FROM fin_payments fp
      JOIN fin_supplier_invoices si ON si.dolibarr_id = fp.invoice_dolibarr_id
      WHERE fp.payment_type = 'supplier' AND si.fk_projet IS NOT NULL AND si.fk_projet > 0
        ${dateFilterPmt}
      GROUP BY si.fk_projet
    `);
    const suppPmtMap = new Map<number, any>();
    for (const sp of suppPmtByProject) suppPmtMap.set(Number(sp.project_id), sp);

    // 6. Cost breakdown by category per project
    const costCatByProject: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.fk_projet as project_id,
        COALESCE(coa.account_category,
          CASE
            WHEN sil.product_label LIKE '%raw%' OR sil.product_label LIKE '%material%' OR sil.product_label LIKE '%مواد%' OR sil.product_label LIKE '%خام%' THEN 'Raw Materials'
            WHEN sil.product_label LIKE '%sub%contract%' OR sil.product_label LIKE '%مقاول%' THEN 'Subcontractors'
            WHEN sil.product_label LIKE '%transport%' OR sil.product_label LIKE '%shipping%' OR sil.product_label LIKE '%freight%' OR sil.product_label LIKE '%نقل%' OR sil.product_label LIKE '%شحن%' THEN 'Transportation'
            WHEN sil.product_label LIKE '%labor%' OR sil.product_label LIKE '%wage%' OR sil.product_label LIKE '%عمال%' THEN 'Labor'
            WHEN sil.product_label LIKE '%equip%' OR sil.product_label LIKE '%machine%' OR sil.product_label LIKE '%معد%' THEN 'Equipment'
            WHEN sil.product_label LIKE '%rent%' OR sil.product_label LIKE '%إيجار%' THEN 'Rent & Facilities'
            ELSE 'Other Costs'
          END
        ) as cost_category,
        SUM(sil.total_ht) as total_ht,
        SUM(sil.total_ttc) as total_ttc
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = sil.accounting_code
      WHERE si.is_active = 1 AND si.status >= 1 AND si.fk_projet IS NOT NULL AND si.fk_projet > 0
        ${dateFilterSup}
      GROUP BY si.fk_projet, cost_category
      ORDER BY si.fk_projet, total_ht DESC
    `);
    const costCatMap = new Map<number, any[]>();
    for (const cc of costCatByProject) {
      const pid = Number(cc.project_id);
      if (!costCatMap.has(pid)) costCatMap.set(pid, []);
      costCatMap.get(pid)!.push({
        category: cc.cost_category,
        totalHT: Number(cc.total_ht),
        totalTTC: Number(cc.total_ttc),
      });
    }

    // 7. Monthly trend per project
    const monthlyRevByProject: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        ci.fk_projet as project_id,
        DATE_FORMAT(ci.date_invoice, '%Y-%m') as month,
        SUM(ci.total_ht) as revenue_ht
      FROM fin_customer_invoices ci
      WHERE ci.is_active = 1 AND ci.status >= 1 AND ci.fk_projet IS NOT NULL AND ci.fk_projet > 0
        ${dateFilter}
      GROUP BY ci.fk_projet, month
      ORDER BY ci.fk_projet, month
    `);
    const monthlyCostByProject: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.fk_projet as project_id,
        DATE_FORMAT(si.date_invoice, '%Y-%m') as month,
        SUM(si.total_ht) as cost_ht
      FROM fin_supplier_invoices si
      WHERE si.is_active = 1 AND si.status >= 1 AND si.fk_projet IS NOT NULL AND si.fk_projet > 0
        ${dateFilterSup}
      GROUP BY si.fk_projet, month
      ORDER BY si.fk_projet, month
    `);

    // Build monthly trend maps
    const monthlyMap = new Map<number, Map<string, { revenue: number; cost: number }>>();
    for (const r of monthlyRevByProject) {
      const pid = Number(r.project_id);
      if (!monthlyMap.has(pid)) monthlyMap.set(pid, new Map());
      const m = monthlyMap.get(pid)!;
      if (!m.has(r.month)) m.set(r.month, { revenue: 0, cost: 0 });
      m.get(r.month)!.revenue += Number(r.revenue_ht);
    }
    for (const c of monthlyCostByProject) {
      const pid = Number(c.project_id);
      if (!monthlyMap.has(pid)) monthlyMap.set(pid, new Map());
      const m = monthlyMap.get(pid)!;
      if (!m.has(c.month)) m.set(c.month, { revenue: 0, cost: 0 });
      m.get(c.month)!.cost += Number(c.cost_ht);
    }

    // 8. Build project list with all metrics
    let totalRevenue = 0, totalCosts = 0, totalCollected = 0, totalOutstanding = 0;
    let totalPaidToSuppliers = 0;

    const projectList = projects.map((proj: any) => {
      const pid = Number(proj.project_id);
      const rev = revMap.get(pid);
      const pmt = pmtMap.get(pid);
      const cost = costMap.get(pid);
      const suppPmt = suppPmtMap.get(pid);
      const costCats = costCatMap.get(pid) || [];

      const revenueHT = Number(rev?.revenue_ht || 0);
      const revenueTTC = Number(rev?.revenue_ttc || 0);
      const costHT = Number(cost?.cost_ht || 0);
      const costTTC = Number(cost?.cost_ttc || 0);
      const collected = Number(pmt?.total_collected || 0);
      const paidToSuppliers = Number(suppPmt?.total_paid_to_suppliers || 0);
      const outstanding = revenueTTC - collected;
      const profit = revenueHT - costHT;
      const marginPct = revenueHT > 0 ? (profit / revenueHT) * 100 : 0;
      const collectionRate = revenueTTC > 0 ? (collected / revenueTTC) * 100 : 0;

      totalRevenue += revenueHT;
      totalCosts += costHT;
      totalCollected += collected;
      totalOutstanding += outstanding;
      totalPaidToSuppliers += paidToSuppliers;

      // Monthly trend for this project
      const projMonthly = monthlyMap.get(pid);
      const monthlyTrend = projMonthly
        ? Array.from(projMonthly.entries()).sort().map(([month, data]) => ({
            month,
            monthLabel: new Date(month + '-01').toLocaleString('en', { month: 'short', year: '2-digit' }),
            revenue: data.revenue,
            cost: data.cost,
            profit: data.revenue - data.cost,
          }))
        : [];

      // Cost category percentages
      const totalCostCat = costCats.reduce((s: number, c: any) => s + c.totalHT, 0);
      const costCategories = costCats.map((c: any) => ({
        ...c,
        percentOfCost: totalCostCat > 0 ? (c.totalHT / totalCostCat) * 100 : 0,
        percentOfRevenue: revenueHT > 0 ? (c.totalHT / revenueHT) * 100 : 0,
      }));

      const statusLabel = proj.fk_statut === 0 ? 'Draft' : proj.fk_statut === 1 ? 'Open' : 'Closed';

      return {
        projectId: pid,
        projectRef: proj.project_ref,
        projectTitle: proj.project_title || proj.project_ref,
        projectDescription: proj.project_description,
        clientName: proj.client_name || 'No Client',
        clientId: Number(proj.fk_soc || 0),
        status: proj.fk_statut,
        statusLabel,
        budgetAmount: Number(proj.budget_amount || 0),
        oppAmount: Number(proj.opp_amount || 0),
        dateStart: proj.date_start,
        dateEnd: proj.date_end,
        dateClose: proj.date_close,
        arrayOptions: proj.array_options ? (typeof proj.array_options === 'string' ? JSON.parse(proj.array_options) : proj.array_options) : null,
        // Financial metrics
        revenueHT,
        revenueTTC,
        revenueVAT: Number(rev?.revenue_vat || 0),
        customerInvoiceCount: Number(rev?.invoice_count || 0),
        collected,
        paymentCount: Number(pmt?.payment_count || 0),
        outstanding,
        collectionRate,
        costHT,
        costTTC,
        costVAT: Number(cost?.cost_vat || 0),
        supplierInvoiceCount: Number(cost?.supplier_invoice_count || 0),
        paidToSuppliers,
        supplierPaymentCount: Number(suppPmt?.supplier_payment_count || 0),
        outstandingPayables: costTTC - paidToSuppliers,
        profit,
        marginPct,
        costCategories,
        monthlyTrend,
      };
    });

    // Sort by revenue descending
    projectList.sort((a: any, b: any) => b.revenueHT - a.revenueHT);

    const totalProfit = totalRevenue - totalCosts;
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const overallCollectionRate = (totalRevenue > 0)
      ? (totalCollected / projectList.reduce((s: number, p: any) => s + p.revenueTTC, 0)) * 100 : 0;

    // Aggregate cost categories across all projects
    const allCostCatMap = new Map<string, number>();
    for (const proj of projectList) {
      for (const cat of proj.costCategories) {
        allCostCatMap.set(cat.category, (allCostCatMap.get(cat.category) || 0) + cat.totalHT);
      }
    }
    const aggregateCostCategories = Array.from(allCostCatMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, totalHT]) => ({
        category,
        totalHT,
        percentOfCost: totalCosts > 0 ? (totalHT / totalCosts) * 100 : 0,
        percentOfRevenue: totalRevenue > 0 ? (totalHT / totalRevenue) * 100 : 0,
      }));

    // Aggregate monthly trend across all projects
    const allMonthMap = new Map<string, { revenue: number; cost: number }>();
    for (const proj of projectList) {
      for (const m of proj.monthlyTrend) {
        if (!allMonthMap.has(m.month)) allMonthMap.set(m.month, { revenue: 0, cost: 0 });
        const entry = allMonthMap.get(m.month)!;
        entry.revenue += m.revenue;
        entry.cost += m.cost;
      }
    }
    const aggregateMonthlyTrend = Array.from(allMonthMap.entries()).sort().map(([month, data]) => ({
      month,
      monthLabel: new Date(month + '-01').toLocaleString('en', { month: 'short', year: '2-digit' }),
      revenue: data.revenue,
      cost: data.cost,
      profit: data.revenue - data.cost,
    }));

    // If a specific project is requested, return its detail
    if (projectId) {
      const detail = projectList.find((p: any) => p.projectId === projectId);
      if (!detail) return { error: 'Project not found' };

      // Get detailed invoice list for this project
      const custInvoices: any[] = await prisma.$queryRawUnsafe(`
        SELECT ci.dolibarr_id, ci.ref, ci.ref_client, ci.total_ht, ci.total_tva, ci.total_ttc,
               ci.date_invoice, ci.date_due, ci.status, ci.is_paid,
               dt.name as client_name
        FROM fin_customer_invoices ci
        LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = ci.socid
        WHERE ci.fk_projet = ? AND ci.is_active = 1 AND ci.status >= 1
        ${dateFilter}
        ORDER BY ci.date_invoice DESC
      `, projectId);

      const suppInvoices: any[] = await prisma.$queryRawUnsafe(`
        SELECT si.dolibarr_id, si.ref, si.ref_supplier, si.total_ht, si.total_tva, si.total_ttc,
               si.date_invoice, si.date_due, si.status, si.is_paid,
               dt.name as supplier_name
        FROM fin_supplier_invoices si
        LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
        WHERE si.fk_projet = ? AND si.is_active = 1 AND si.status >= 1
        ${dateFilterSup}
        ORDER BY si.date_invoice DESC
      `, projectId);

      const payments: any[] = await prisma.$queryRawUnsafe(`
        SELECT fp.dolibarr_ref, fp.payment_type, fp.amount, fp.payment_date, fp.payment_method,
               CASE WHEN fp.payment_type = 'customer' THEN ci.ref ELSE si.ref END as invoice_ref
        FROM fin_payments fp
        LEFT JOIN fin_customer_invoices ci ON ci.dolibarr_id = fp.invoice_dolibarr_id AND fp.payment_type = 'customer'
        LEFT JOIN fin_supplier_invoices si ON si.dolibarr_id = fp.invoice_dolibarr_id AND fp.payment_type = 'supplier'
        WHERE (ci.fk_projet = ? OR si.fk_projet = ?)
        ORDER BY fp.payment_date DESC
      `, projectId, projectId);

      return {
        mode: 'detail',
        project: detail,
        customerInvoices: custInvoices.map((inv: any) => ({
          dolibarrId: inv.dolibarr_id,
          ref: inv.ref,
          refClient: inv.ref_client,
          clientName: inv.client_name,
          totalHT: Number(inv.total_ht),
          totalVAT: Number(inv.total_tva),
          totalTTC: Number(inv.total_ttc),
          dateInvoice: inv.date_invoice,
          dateDue: inv.date_due,
          status: inv.status,
          isPaid: inv.is_paid === 1,
        })),
        supplierInvoices: suppInvoices.map((inv: any) => ({
          dolibarrId: inv.dolibarr_id,
          ref: inv.ref,
          refSupplier: inv.ref_supplier,
          supplierName: inv.supplier_name,
          totalHT: Number(inv.total_ht),
          totalVAT: Number(inv.total_tva),
          totalTTC: Number(inv.total_ttc),
          dateInvoice: inv.date_invoice,
          dateDue: inv.date_due,
          status: inv.status,
          isPaid: inv.is_paid === 1,
        })),
        payments: payments.map((p: any) => ({
          ref: p.dolibarr_ref,
          type: p.payment_type,
          amount: Number(p.amount),
          date: p.payment_date,
          method: p.payment_method,
          invoiceRef: p.invoice_ref,
        })),
      };
    }

    return {
      mode: 'summary',
      fromDate: fromDate || null,
      toDate: toDate || null,
      summary: {
        totalProjects: projects.length,
        projectsWithRevenue: projectList.filter((p: any) => p.revenueHT > 0).length,
        projectsWithCosts: projectList.filter((p: any) => p.costHT > 0).length,
        totalRevenue,
        totalCosts,
        totalProfit,
        overallMargin,
        totalCollected,
        totalOutstanding,
        overallCollectionRate,
        totalPaidToSuppliers,
        totalOutstandingPayables: projectList.reduce((s: number, p: any) => s + p.outstandingPayables, 0),
        profitableProjects: projectList.filter((p: any) => p.profit > 0).length,
        lossProjects: projectList.filter((p: any) => p.profit < 0 && p.revenueHT > 0).length,
      },
      projects: projectList,
      aggregateCostCategories,
      aggregateMonthlyTrend,
    };
  }
}
