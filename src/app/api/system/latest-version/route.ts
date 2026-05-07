import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'May 7, 2026',
  type: 'patch' as const,
  mainTitle: '404 Fix, Sidebar Modules & Activity Unification',
  highlights: [
    '/subcontractor-contracts now redirects to /supply-chain/subcontractors instead of returning 404.',
    'Project Card and SC Contracts now appear in sidebar for admin/CEO users.',
    'Activity names unified across all modules: "Dispatch" renamed to "Delivery" system-wide.',
    'Tasks table gains a Scope of Work column between Building and Main Activity.',
  ],
  changes: {
    added: [
      '/subcontractor-contracts redirect page.',
      'Scope of Work column in tasks table between Building and Main Activity.',
      'DB migration v23.0.1: dispatch→delivery in BuildingActivity; delivery_logistics→delivery in Task.mainActivity.',
    ],
    fixed: [
      'Project Card and SC Contracts missing from sidebar (admin/CEO).',
      'Project tracker Delivery column showing 0% — TRACKER_COLUMNS updated from dispatch to delivery.',
    ],
    changed: [
      'Activity "dispatch" renamed to "delivery" across all system modules.',
      'Activity "delivery_logistics" renamed to "delivery" in task activity constants.',
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
