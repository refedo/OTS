import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '📒 Financial Accuracy & Manual Journal Entries',
  highlights: [
    'Manual Journal Entries — new /financial/manual-journal-entries page for creating locked double-entry journal entries with live balance validation, journal code guide, and COA combobox search',
    'Financial dashboard fix — Revenue and Gross Profit now use journal entry metadata (source_type/journal_code) instead of COA account_type; resilient to COA configuration changes',
    'Balance sheet accuracy — bank account codes auto-added to COA during sync; balance sheet P&L lines use source_type queries for correct figures',
    'Statement of Account UX — mobile combobox search, Current Outstanding stat, AR/AP green/red color distinction',
    'PWA install prompt — "Don\'t show again" now correctly persists to localStorage',
  ],
  changes: {
    added: [
      {
        title: 'Manual Journal Entries (/financial/manual-journal-entries)',
        items: [
          'Multi-line double-entry form with live balance indicator (green = balanced, amber = unbalanced with Δ shown)',
          'Journal code selector with OD / AN / RAN / BQ / VTE / ACH / SAL definitions and use descriptions',
          'Collapsible Journal Guide explaining double-entry rules, normal balances per account type, and common transaction patterns',
          'COA combobox with search, account type badges, and autoFocus on open',
          'Entries saved as is_locked=1 (survive sync cycles); piece_num starts at 9000001',
          'DELETE support — remove all lines for a journal entry by piece_num',
          'Sidebar link under Financial section with BookOpen icon',
        ],
      },
    ],
    fixed: [
      'Financial dashboard Revenue = 0 — decoupled revenue/expense/salary calculations from COA account_type; now uses source_type + journal_code + label prefix filtering on fin_journal_entries',
      'Balance sheet unbalanced by ~12.3M SAR — bank account codes from fin_bank_accounts now auto-inserted into fin_chart_of_accounts (INSERT IGNORE) during every sync cycle',
      'Balance sheet P&L lines — revenue, expense, and salary totals now derived from source_type queries matching the dashboard approach',
      'PWA install prompt "Don\'t show again" — ManualInstallGuide now receives onDismissPermanently prop and correctly writes to localStorage instead of sessionStorage',
      'Statement of Account mobile search — replaced shadcn Select (no search on mobile) with a custom combobox component matching the Aging report pattern',
    ],
    changed: [
      'Statement of Account — added Current Outstanding stat card (sum of remainToPay across all report lines) alongside Total Invoiced, Total Paid, and Period Balance',
      'Statement of Account — AR type shown with green badge, AP type shown with red badge for visual distinction',
      'Removed deprecated financial pages: /financial/account-mapping, /financial/product-categories, /financial/supplier-classification (replaced by /financial/product-coa-mapping)',
    ],
  },
};

export async function GET(_req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  let alreadySeen = false;
  if (session) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { customPermissions: true },
      });
      const perms = user?.customPermissions as Record<string, unknown> | null;
      if (perms?.lastSeenVersion === CURRENT_VERSION.version) {
        alreadySeen = true;
      }
    } catch {
      // Non-critical; fall back to client-side check
    }
  }

  return NextResponse.json({ ...CURRENT_VERSION, alreadySeen });
}
