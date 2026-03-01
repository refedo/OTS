import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.18.0',
  date: 'March 1, 2026',
  type: 'minor' as const,
  mainTitle: 'Financial Reports Enhancements',
  highlights: [
    'New Expenses by Account report with monthly breakdown',
    'Improved Project Analysis chart visualization',
    'Fixed contract amount to use Lead Amount from Dolibarr',
    'Fixed Excel export and account mapping errors',
  ],
  changes: {
    added: [
      'Expenses by Account Report — monthly breakdown of expenses grouped by accounting account',
      'Shows all 12 months (Jan-Dec) with amounts per account',
      'Displays account code and account name from Dolibarr',
      'Monthly totals and grand total columns',
      'Excel/CSV export functionality',
    ],
    fixed: [
      'Excel Export — Journal entries and OTS Journal entries exports now work correctly',
      'Changed file extension from .xlsx to .csv to match actual content',
      'Account Mapping Errors — removed dependency on non-existent dolibarr_accounting_account table',
      'Fixed "Unknown column sil.description" error in drill-down modal',
      'Project Analysis Contract Amount — now reads Lead Amount (opp_amount) instead of Budget',
    ],
    changed: [
      'Project Analysis Chart — replaced line chart with horizontal bar chart for better visualization',
      'Shows actual values directly on bars (e.g., "SAR 2.74M")',
      'Clear profit/loss display for each month',
      'Better visual comparison between revenue and cost',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
