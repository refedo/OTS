import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.7.0',
  date: 'February 23, 2026',
  type: 'minor' as const,
  mainTitle: '📊 Project Analysis Report',
  highlights: [
    'Comprehensive project P&L with revenue, costs, profit & margin',
    'Dolibarr project sync into mirror table',
    'Invoice-to-project linking via fk_projet',
    'Detail drill-down with invoices, payments & monthly trends',
  ],
  changes: {
    added: [
      'Project Analysis Report — per-project revenue, costs, profit/loss, margin %, collection rate',
      'Dolibarr projects sync into dolibarr_projects mirror table',
      'fk_projet column on customer & supplier invoice tables',
      'Cost breakdown by category per project',
      'Monthly revenue vs cost trend per project',
      'Detail view with customer invoices, supplier invoices, and payment history',
      'Aggregate KPIs: total revenue, costs, profit, collection rate across all projects',
    ],
    fixed: [],
    changed: [
      'Replaced old Project Profitability report with comprehensive Project Analysis',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
