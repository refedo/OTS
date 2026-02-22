/**
 * Financial Report Generation Service
 * 
 * Generates Trial Balance, Income Statement, Balance Sheet,
 * VAT Report, and Aging Report from journal entries.
 */

import prisma from '@/lib/db';

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
      row.invoices.push({
        ref: inv.ref,
        dateInvoice: inv.date_invoice ? new Date(inv.date_invoice).toISOString().slice(0, 10) : '',
        dateDue: inv.date_due ? new Date(inv.date_due).toISOString().slice(0, 10) : '',
        totalAmount: totalTtc,
        amountPaid,
        remaining,
        ageBucket,
        daysOverdue: Math.max(0, daysOverdue),
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
  // DASHBOARD SUMMARY
  // ============================================

  async getDashboardSummary(fromDate: string, toDate: string): Promise<any> {
    let totalRevenue = 0, totalExpenses = 0, totalAR = 0, totalAP = 0;
    let vatOutputTotal = 0, vatInputTotal = 0;

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

    // VAT Output (collected on sales) - from customer invoice lines
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

    // VAT Input (paid on purchases) - from supplier invoice lines
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

    try {
      // Calculate AR: Sum of unpaid invoices minus payments received
      const arInvoices: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(ci.total_ttc), 0) as total_invoiced
        FROM fin_customer_invoices ci
        WHERE ci.is_active = 1 AND ci.is_paid = 0 AND ci.status >= 1
      `);
      const arPayments: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(fp.amount), 0) as total_paid
        FROM fin_payments fp
        WHERE fp.payment_type = 'customer'
      `);
      totalAR = Number(arInvoices[0]?.total_invoiced || 0) - Number(arPayments[0]?.total_paid || 0);
      if (totalAR < 0) totalAR = 0;
    } catch { /* */ }

    try {
      // Calculate AP: Sum of unpaid supplier invoices minus payments made
      const apInvoices: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(si.total_ttc), 0) as total_invoiced
        FROM fin_supplier_invoices si
        WHERE si.is_active = 1 AND si.is_paid = 0 AND si.status >= 1
      `);
      const apPayments: any[] = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(SUM(fp.amount), 0) as total_paid
        FROM fin_payments fp
        WHERE fp.payment_type = 'supplier'
      `);
      totalAP = Number(apInvoices[0]?.total_invoiced || 0) - Number(apPayments[0]?.total_paid || 0);
      if (totalAP < 0) totalAP = 0;
    } catch { /* */ }

    // Bank balances
    let bankAccounts: any[] = [];
    try {
      bankAccounts = await prisma.$queryRawUnsafe(
        `SELECT dolibarr_id, ref, label, bank_name, balance, currency_code, is_open FROM fin_bank_accounts ORDER BY label`
      );
    } catch { /* */ }

    return {
      period: { from: fromDate, to: toDate },
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
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
}
