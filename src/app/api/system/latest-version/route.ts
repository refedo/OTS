import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔧 LCR Comparison Fix, PTS Column Mapping & Duplicate Part Aggregation',
  highlights: [
    'LCR comparison panel now shows correct supplier/amount/price data — column indices were offset',
    'PTS Sync now uses your custom column mapping for weights and all fields',
    'Duplicate part numbers are now aggregated (quantities summed, weight multiplied) instead of last-wins',
    'Execute page now shows matched buildings for selection before syncing',
  ],
  changes: {
    added: [
      'PTS Sync execute page: matched building selection card grouped by project',
      'PTS Sync: duplicate part number detection — consolidates rows, sums quantities, calculates total weight',
      'PTS Sync: duplicate count notification in sync results',
    ],
    fixed: [
      'LCR comparison: DEFAULT_LCR_COL_MAP corrected from gapped indices to consecutive — supplier, amount, and price were shifted to wrong columns',
      'PTS Sync weights: custom column mapping from the mapping UI is now passed through API to the sync service — previously hardcoded defaults were always used',
      'PTS Sync: dynamic sheet range based on mapped columns — ensures all mapped data is fetched',
    ],
    changed: [
      'PTS Sync: duplicate parts are now aggregated (qty summed, weight = singlePartWeight × total qty) instead of last occurrence winning',
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
