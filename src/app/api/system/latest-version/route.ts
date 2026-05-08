import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'May 8, 2026',
  type: 'minor' as const,
  mainTitle: 'Backlog Card Improvements, Sidebar & Full Changelog',
  highlights: [
    'Backlog item header now shows submitter name and submission date for immediate context.',
    'One-click copy button on the description card and Share on WhatsApp button in Quick Actions.',
    'Marking a backlog item as Completed now backfills all skipped stages with the finisher\'s name and timestamp.',
    'CEO/admin users receive an in-app notification when any backlog item is submitted — toggle on/off from Settings → Notifications.',
    '"Backlog Dashboard" is now the primary sidebar entry for the Product Backlog section — replaces "Backlog Board".',
    'Full changelog coverage restored: entries for v22.5.2 through v22.8.0 added to the in-app changelog page.',
  ],
  changes: {
    added: [
      'Submitter name and date shown in backlog item detail page header.',
      'Copy description button with visual feedback on backlog item detail page.',
      'Share on WhatsApp button in Quick Actions sidebar.',
      'Stage backfill on COMPLETED: skipped intermediate stages stamped with finisher name + timestamp.',
      'CEO notification on backlog creation sent to all users with backlog.ceo_center permission.',
      '"Notify CEO on New Backlog Item" toggle in Settings → Notifications.',
      '"Backlog Dashboard" sidebar entry — renamed from "Backlog Board" with a LayoutDashboard icon.',
      'Changelog entries for v22.5.2, v22.6.0, v22.6.4, v22.7.0, and v22.8.0 restored to the in-app changelog page.',
    ],
    fixed: [],
    changed: [
      'Sidebar Product Backlog section: "Backlog Board" renamed to "Backlog Dashboard" and moved to top of section.',
      'Version bumped to 23.3.0',
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
