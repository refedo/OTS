import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔧 Supply Chain UX Improvements & Dolibarr Integrations',
  highlights: [
    'New Purchase Orders page at /supply-chain/purchase-orders shows Dolibarr POs with status, supplier, project, and totals',
    'Supply Chain sidebar now links to Purchase Orders, AP Aging Report (pre-selected), and Statement of Account',
    'LCR filter bar redesigned into a single row — project and status dropdowns no longer overlap',
    'Alias management now fetches ALL Dolibarr suppliers via auto-pagination (was capped at 200)',
    'Aging Report reads ?type=payable URL param to pre-select Accounts Payable automatically',
  ],
  changes: {
    added: [
      {
        title: 'Purchase Orders Page',
        items: [
          'New page /supply-chain/purchase-orders — lists Dolibarr purchase orders in OTS',
          'Status badges (Draft / Validated / Approved / Ordered / Partially Received / Received / Canceled / Refused) with colour coding',
          'Supplier name, supplier ref, project ref, order date, delivery date, billing status, HT and TTC totals per row',
          'Client-side status filter + full-text search (ref, supplier, project); configurable page size with prev/next pagination',
          'Open in Dolibarr button linking to the Dolibarr supplier orders module',
        ],
      },
      {
        title: 'Supply Chain Sidebar',
        items: [
          'Purchase Orders → /supply-chain/purchase-orders',
          'AP Aging Report → /financial/reports/aging?type=payable (deep-links to Accounts Payable)',
          'Statement of Account → /financial/reports/soa',
          'Navigation permission registered for /supply-chain/purchase-orders (supply_chain.view)',
        ],
      },
      'Aging Report: reads ?type=payable query param on load and auto-initialises type to Accounts Payable',
    ],
    fixed: [
      {
        title: 'LCR Page Layout',
        items: [
          'Merged page title and all filter controls into a single flex-wrap row — eliminates project/status overlap',
          'Project dropdown widened from w-56 to w-64; Status from w-44 to w-52 with "All Statuses" placeholder',
          'Sync Now / Reports buttons and row/sync stats moved to far right of the same header row',
        ],
      },
      {
        title: 'Alias Management — complete supplier list',
        items: [
          'Alias page was capped at 200 Dolibarr suppliers due to API hard limit',
          'Now reads pagination.total and fetches remaining pages in parallel so all suppliers appear in the combobox',
        ],
      },
    ],
    changed: [],
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
