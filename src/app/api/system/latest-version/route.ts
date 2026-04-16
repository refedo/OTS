import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Asset SN Auto-Counter, Backlog GitHub Sync Fix, Global Search Enhancements & Sortable Tables',
  highlights: [
    'Asset registry: auto-generated sequential SN (continuous across all asset types); Asset Code is now editable in edit mode for type-prefixed naming (CAR-001, LAP-001, etc.).',
    'Backlog "Push to GitHub" now syncs ALL items — creates new issues AND closes GitHub issues for COMPLETED/DROPPED items.',
    'Global search: assets now show plate number and assigned employee name in results.',
    'Sortable table headers added to Assets registry, Loans, Custodies, and Contracts tables.',
    'Permission resolution in /api/hr/loans/all and /api/hr/custodies/all upgraded to use resolveUserPermissions() (fixes scoping for users with custom grants/revokes).',
  ],
  changes: {
    added: [
      'Asset.assetSn: auto-increment integer field (continuous SN across all asset types); add_asset_sn.sql migration with backfill',
      'Sortable table headers (SortTh) in Assets registry, Loans, Custodies, and Contracts tables',
      'Asset Code (assetCode) now editable in asset edit form; uniqueness enforced server-side',
      'SN column added to assets registry table view',
    ],
    fixed: [
      'Backlog "Push All to GitHub" now includes COMPLETED/DROPPED items (closes their GitHub issues) — previously only pushed unsynced open items',
      'Global search asset subtitle now includes plate number and assigned employee name',
      'loans/all and custodies/all routes now use resolveUserPermissions() — fixes wrong scoping for users with custom permission grants/revokes',
    ],
    changed: [
      'Version bumped to 18.18.2',
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
