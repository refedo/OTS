import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔧 Financial Report Fixes & COA Account Breakdown',
  highlights: [
    'New "Cost Structure by Account Number" table in Project Analysis — see spend by individual COA account code (raw material, paint, sub-contracting, etc.)',
    'Aggregate Cost Breakdown now filters correctly when searching for a specific project',
    'Category drill-downs (Cost of Sales, Fixed Assets, Operating Expenses) now return invoice line results',
    'Bulk assign in product-coa-mapping now works correctly in the dialog',
  ],
  changes: {
    added: [
      {
        title: 'Cost Structure by Account Number',
        items: [
          'New collapsible table in Project Analysis showing spend per COA account code',
          'Columns: account code, name, Arabic name, category, invoice count, line count, % of total, amount',
          'Data sourced from fin_product_coa_mapping → fin_chart_of_accounts',
        ],
      },
    ],
    changed: [],
    fixed: [
      'Aggregate Cost Breakdown recomputes from filtered projects when search is active',
      'Cost of Sales / Fixed Assets / Operating Expenses drill-down now returns invoice lines',
      'Invoice detail drill-down passes filtered project IDs for scoped results',
      'Bulk assign CoaCombobox in product-coa-mapping: account selection now works inside Radix Dialog',
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
