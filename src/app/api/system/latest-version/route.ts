import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.9.0',
  date: 'February 24, 2026',
  type: 'minor' as const,
  mainTitle: '📊 Financial Dashboard Improvements',
  highlights: [
    'All dashboard KPIs are now clickable — links to source reports',
    'New Asset Report and Salaries Report pages',
    'Smart number formatting (K SAR for small amounts)',
    'Salaries now showing correctly and included in expenses',
  ],
  changes: {
    added: [
      'Asset Report — all asset accounts grouped by category with balances',
      'Salaries Report — salary records grouped by month with paid/unpaid status',
      'Projects count on dashboard with sync button',
      'All dashboard KPI cards link to their source reports',
    ],
    fixed: [
      'Salaries showing SAR 0 — falls back to fin_salaries table',
      'Salaries now included in Total Expenses calculation',
      'Invoice sync hash includes fk_project for project link backfill',
    ],
    changed: [
      'Smart formatting: amounts < 1M show as K SAR instead of 0.xxM',
      'Removed duplicate Net Profit Margin — merged into Net Profit card',
      'Removed duplicate Cost of Sales — kept Total Expenses only',
      'Dashboard Row 2 reorganized: Gross Profit, ROA, ROE, Salaries, Projects',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
