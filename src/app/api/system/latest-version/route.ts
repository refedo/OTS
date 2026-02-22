import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.4.1',
  date: 'February 22, 2026',
  type: 'patch' as const,
  mainTitle: '🔧 Financial Sync Production Fix',
  highlights: [
    'Journal Entry Data Loss Prevention',
    'Full Sync Resilience',
    'API Timeout & Batch Size Increase',
    'Progress Logging for Debugging',
  ],
  changes: {
    added: [],
    fixed: [
      'Journal entries now generated in memory first — old entries deleted only after successful generation (prevents 0 entries / SAR 0.00)',
      'Each sync step wrapped in individual try/catch — supplier invoice failure no longer blocks journal entry generation',
      'Dolibarr API timeout increased from 30s to 120s for large batch fetches',
      'Pagination batch size increased from 100 to 500 (reduces API calls from 89 to 18 for 8880 invoices)',
      'Added progress logging every 100 invoices and per-page during Dolibarr API pagination',
    ],
    changed: [],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
