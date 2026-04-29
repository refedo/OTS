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
  mainTitle: 'Stability & Version Alignment',
  highlights: [
    'Confirms 22.5.2 features as stable: Account Invoice Report, orphan purge (POST /api/financial/purge-orphans), and sidebar double-render fix are all verified in production.',
    'All financial report sidebar links updated to include the Account Invoice Report.',
    'Version alignment across package.json, changelog, and settings/about.',
  ],
  changes: {
    added: [],
    fixed: [],
    changed: [
      'Version bumped to 22.5.3 (stability confirmation — no new features)',
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
