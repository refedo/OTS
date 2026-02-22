import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.0.0',
  date: 'February 22, 2026',
  type: 'major' as const,
  mainTitle: '� Financial Reporting Module',
  highlights: [
    'Trial Balance, Income Statement & Balance Sheet',
    'VAT Report (ZATCA-ready) with Input/Output breakdown',
    'AR/AP Aging Report with age buckets',
    'Auto-generated double-entry journal entries from Dolibarr',
    'Chart of Accounts management with Arabic support',
  ],
  changes: {
    added: [
      {
        title: '� Financial Reporting Engine',
        items: [
          'Trial Balance with opening/period/closing balances',
          'Income Statement (P&L) with gross profit, operating profit, and net profit',
          'Balance Sheet with assets, liabilities, equity, and balance verification',
          'VAT Report with 5% and 15% rate breakdown (ZATCA compliance)',
          'AR/AP Aging Report with Current, 1-30, 31-60, 61-90, 90+ day buckets',
        ],
      },
      {
        title: '🔗 Financial Data Sync from Dolibarr',
        items: [
          'Customer invoice sync with line-level detail and VAT rates',
          'Supplier invoice sync with payment tracking',
          'Payment sync per invoice (customer and supplier)',
          'Bank account sync with balances from Dolibarr',
          'MD5 hash-based change detection for efficient syncing',
        ],
      },
      {
        title: '📒 Auto-Generated Journal Entries',
        items: [
          'Double-entry bookkeeping from synced invoices and payments',
          'Customer invoice → Debit AR, Credit Revenue + VAT Output',
          'Supplier invoice → Debit Expense + VAT Input, Credit AP',
          'Payments → Debit/Credit Bank and AR/AP accounts',
          'Credit note support with reversed entries',
          'Configurable default account mappings',
        ],
      },
      {
        title: '� Chart of Accounts',
        items: [
          'Full CRUD for chart of accounts with Arabic name support',
          'Account types: Asset, Liability, Equity, Revenue, Expense',
          'Category grouping for structured reports',
          'Pre-populated Saudi standard chart of accounts',
        ],
      },
      {
        title: '⚙️ Financial Settings',
        items: [
          'Default account mapping configuration (AR, AP, Revenue, Expense, VAT)',
          'Bank account to accounting code mapping',
          'Automated 2-hour sync via cron endpoint',
        ],
      },
    ],
    fixed: [],
    changed: [
      'Added Financial Reports section to sidebar navigation',
      'Updated navigation permissions for financial module routes',
      'Extended Dolibarr API client with invoice, payment, and bank account methods',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
