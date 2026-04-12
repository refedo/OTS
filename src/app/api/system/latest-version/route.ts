import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '⚡ v18.0.1 Patch — PTS Full Sync 504 Timeout Fix',
  highlights: [
    'PTS full sync 504 Gateway Timeout fixed — N+1 per-building stats queries replaced with concurrent grouped queries (groupBy + raw JOIN)',
    'Stats phase now completes in milliseconds instead of minutes, even on production-sized datasets',
    '/api/pts-sync/full-sync maxDuration raised from 300s to 600s for additional headroom on very large tenants',
    'First patch on top of the v18.0.0 HR / Payroll Module Launch — no schema, migration, or permission changes',
  ],
  changes: {
    added: [],
    fixed: [
      'PTS full sync 504 Gateway Timeout: calculateProjectStats() was running 6 sequential DB queries per building (O(projects × buildings)) — replaced with 3 concurrent queries (assemblyPart.groupBy + raw SQL JOIN on ProductionLog + building.findMany) plus in-memory aggregation via per-project and per-building Maps',
      'PTS full sync route maxDuration raised from 300s to 600s on /api/pts-sync/full-sync for very large datasets',
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
