import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔍 LCR Search Fix, PTS Per-Building Rollback & Building Selection',
  highlights: [
    'LCR search now works correctly — previously search was ignored when sorting by SN (the default)',
    'PTS Sync now shows per-building results with individual rollback buttons',
    'Building selection grouped by project with no truncation',
    'Uploaded parts are now tagged source="Upload" so PTS rollback can never delete them',
  ],
  changes: {
    added: [
      'PTS Sync: per-building rollback — roll back a single building instead of the entire project',
      'PTS Sync results: per-building breakdown with parts/logs counts',
      'Rollback confirmation now lists all affected buildings',
    ],
    fixed: [
      'LCR search: raw SQL SN sort now includes search and date filters — search was completely ignored on default sort',
      'PTS rollback safety: uploaded parts tagged source="Upload" for extra protection',
    ],
    changed: [
      'PTS building selection: grouped by project, all buildings visible (no truncation)',
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
