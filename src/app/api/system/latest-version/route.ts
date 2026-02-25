import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.14.0',
  date: 'February 26, 2026',
  type: 'minor' as const,
  mainTitle: 'Financial & Production Module Enhancements',
  highlights: [
    'Project analysis: search by name/number, contract value columns, aggregate cost drill-down',
    'Journal entries: Excel export and hierarchical account view with collapsible drill-down',
    'Financial reports: Excel export for Trial Balance and Income Statement',
    'Assembly parts: length column added and fixed critical refresh loop bug',
  ],
  changes: {
    added: [
      'Project analysis search — filter projects by name, number, or client',
      'Contract value and balance columns in project analysis table',
      'Aggregate cost drill-down — click any cost category to see invoice line details',
      'Journal entries Excel export — export to CSV with one click',
      'Journal entries hierarchy view — group by account with collapsible drill-down',
      'Trial Balance Excel export — export report to CSV',
      'Income Statement Excel export — export P&L to CSV',
      'Assembly parts length column — added Length (mm) to parts list',
    ],
    fixed: [
      'CRITICAL: Assembly parts page refresh loop — totalArea.toFixed error from Prisma Decimal objects',
      'Status-by-name report refresh loop — API response format changed to paginated',
      'RBAC: CEO account forbidden on upload — now uses permission-based checks',
      'RBAC: CEO cannot mark tasks complete — replaced hardcoded role checks with permissions',
      'Cost drill-down API 400 errors — now supports aggregate queries without projectId',
      'Journal by account view 400 error — fixed SQL query construction',
    ],
    changed: [
      'Replaced hardcoded role checks with permission-based system for scalability',
      'Toast notifications replace standard alert() calls in upload and assembly-parts pages',
      'Project analysis table renamed "Revenue" to "Invoiced" for clarity',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
