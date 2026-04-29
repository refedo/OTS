import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 29, 2026',
  type: 'patch' as const,
  mainTitle: 'Account Invoice Report, Orphan Purge & Sidebar Fix',
  highlights: [
    'New Account Invoice Report: select any accounting account (Raw Material, Bolts & Nuts, etc.) and see its spend broken down by project with % of project cost.',
    'Hard-refresh purge: any invoice or payment deleted in Dolibarr but still lingering in OTS is now deactivated and cleaned up via POST /api/financial/purge-orphans.',
    'Sidebar double-render fixed — users who saw two sidebars on /operations/events and /projects/[id]/planning will now see exactly one.',
  ],
  changes: {
    added: [
      '/financial/reports/account-invoice-report — select an accounting account (e.g. Raw Material, Bolts & Nuts); KPI strip: Total on Account, % of All Supplier Spend, Total Paid, Outstanding Balance; per-project breakdown with share progress bars and expandable invoice + payment rows',
      'GET /api/financial/reports/account-invoice-report — account KPIs, per-project summary with pctOfProjectCost, full invoice + payment list',
      'GET /api/financial/reports/account-invoice-report/accounts — dropdown list of all accounting accounts with total spend',
      'POST /api/financial/purge-orphans — fetches all current Dolibarr invoice IDs, deactivates any OTS invoice not returned, deletes their orphaned payments and lines',
      '"Account Invoice Report" added to the main sidebar under Financial Reports',
    ],
    fixed: [
      'Sidebar rendered twice for users visiting /operations/events/* or /projects/[id]/planning — nested ResponsiveLayout wrappers removed from those child layouts',
    ],
    changed: [
      'Version bumped to 22.5.2',
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
