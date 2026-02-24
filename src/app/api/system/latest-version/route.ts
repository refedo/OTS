import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.12.0',
  date: 'February 24, 2026',
  type: 'minor' as const,
  mainTitle: '� Financial API Security & Cost Fix',
  highlights: [
    'All 27 financial API routes now enforce server-side permission checks',
    'Fixed Cartesian join bug causing duplicate project rows with identical costs',
    'Per-project supplier invoice costs now correctly calculated',
    'Unauthorized users get 403 Access Denied instead of seeing financial data',
  ],
  changes: {
    added: [
      'requireFinancialPermission() — shared server-side guard for all financial APIs',
      'HTTP 403 response for users without financial.view permission',
    ],
    fixed: [
      'CRITICAL: Cartesian product in client name subquery — projects with multiple customers duplicated rows',
      'All projects showing identical costs (SAR 311K) — was caused by duplicated rows, not real data',
      'Financial reports accessible via direct URL without permission — now returns 403',
      'Console TypeError: fetchRiskCount failed to fetch — silenced non-critical error',
    ],
    changed: [
      'All 27 financial API routes use requireFinancialPermission() instead of basic session check',
      'Client name subquery uses ROW_NUMBER() to return exactly 1 client per project',
      'Write operations (sync, config PUT, chart-of-accounts POST/PUT/DELETE) require financial.manage',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
