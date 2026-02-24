import { NextResponse } from 'next/server';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  version: '15.11.0',
  date: 'February 24, 2026',
  type: 'minor' as const,
  mainTitle: '📊 Project Analysis & RBAC Fix',
  highlights: [
    'Financial pages now properly hidden without financial.view permission',
    'Client names resolved from customer invoices when fk_soc is missing',
    'Project status inferred from invoices (Open if has revenue)',
    'Clickable cost breakdown per project in summary table',
  ],
  changes: {
    added: [
      'Clickable cost column — inline cost breakdown per project',
      'Unlinked supplier costs warning with stats',
      'Client name fallback from customer invoices',
      'Enhanced monthly chart with Y-axis gridlines and totals',
    ],
    fixed: [
      'RBAC: removed settings.view from financial navigation permissions',
      'Project status all showing Draft — now inferred from revenue/close date',
      'Client column empty — added fallback JOIN on customer invoices',
      'Project sync: reads socid/statut as fallbacks from Dolibarr API',
      'Removed unused Percent icon import (HMR error)',
    ],
    changed: [
      'Compact table layout — smaller padding, text-xs, truncated columns',
      'Revenue/Cost/Collected shown in compact format (K SAR / M SAR)',
      'Monthly chart enhanced with gridlines, value labels, and legend totals',
    ],
  },
};

export async function GET() {
  return NextResponse.json(CURRENT_VERSION);
}
