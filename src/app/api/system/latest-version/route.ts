import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🚀 Supply Chain Management Module — Complete LCR System',
  highlights: [
    'Full-featured Supply Chain module with Google Sheets integration for automated procurement tracking',
    'LCR (Least Cost Routing) data table with filters, sync status bar, and detail drawer showing LCR1/2/3 comparisons',
    'Alias management system auto-resolves project/building/supplier names from informal sheet text',
    '4 analytics reports: Status breakdown, Spend vs Target, Supplier Performance, and Overdue Items',
    '12 API endpoints including sync, CRUD, alias management, and reports with comprehensive filtering',
  ],
  changes: {
    added: [
      {
        title: 'Database & Models',
        items: [
          '3 new Prisma models: LcrEntry (30+ fields), LcrAliasMap (informal name mapping), LcrSyncLog (sync history)',
          'Foreign key relations: Project.lcrEntries, Building.lcrEntries, User.lcrAliasMaps',
          'SQL migrations: add_supply_chain_lcr.sql (tables + indexes) and add_supply_chain_permissions.sql (RBAC)',
        ],
      },
      {
        title: 'Sync Engine',
        items: [
          'Google Sheets sync service with MD5 hash change detection and intelligent upserts',
          'Alias resolution system auto-resolves project IDs, product IDs, building IDs, and supplier IDs',
          'Automated scheduler using node-cron, configurable interval (default 30 min)',
          'Soft-delete handling for rows removed from sheet',
          'Date parsing supports YYYY-MM-DD and DD/MM/YYYY formats',
        ],
      },
      {
        title: 'API Routes (12 endpoints)',
        items: [
          'GET /api/supply-chain/lcr — Paginated entries with 6 filter options',
          'GET /api/supply-chain/lcr/[id] — Single entry detail with relations',
          'POST /api/supply-chain/lcr/sync — Manual sync trigger (admin only)',
          'GET/POST/DELETE /api/supply-chain/lcr/aliases — Alias management with auto back-fill',
          'GET /api/supply-chain/lcr/sync-logs — Last 20 sync runs with metrics',
          '4 report endpoints: status, spend-vs-target, supplier-performance, overdue',
          'POST /api/cron/lcr-sync — External cron endpoint with Bearer token auth',
        ],
      },
      {
        title: 'User Interface (3 pages)',
        items: [
          'LCR Main Page: Data table with 10 columns, 5 filters, sync status bar, detail drawer with LCR comparison',
          'Reports Page: 4 report cards with recharts visualizations (stacked bar chart + tables)',
          'Alias Management Page: Pending alias resolver + existing mappings table (admin only)',
          'Overdue highlighting with red text and days overdue badges',
          'Resolution status icons (green checkmark = resolved, amber warning = pending)',
        ],
      },
      {
        title: 'Navigation & Permissions',
        items: [
          'Sidebar section "Supply Chain" with Package icon and 3 menu items',
          'RBAC permissions: supply_chain.view, supply_chain.sync, supply_chain.alias',
          'Navigation permissions added to route-level access control',
        ],
      },
      {
        title: 'Environment Variables',
        items: [
          'GOOGLE_SHEETS_KEY_JSON — Service account JSON for Google Sheets API',
          'GOOGLE_SHEET_LCR_ID — Google Sheet ID',
          'GOOGLE_SHEET_LCR_RANGE — Sheet tab and column range (default: Sheet1!A:AJ)',
          'LCR_SYNC_INTERVAL_MINUTES — Sync interval (default: 30)',
          'ENABLE_LCR_SCHEDULER — Enable/disable automatic sync',
        ],
      },
    ],
    fixed: [],
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
