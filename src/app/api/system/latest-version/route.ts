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
  mainTitle: 'Backlog Card Improvements & CEO Workflow',
  highlights: [
    'Backlog item header now shows submitter name and submission date for immediate context.',
    'One-click copy button on the description card with "Copied!" confirmation.',
    'Share on WhatsApp button in Quick Actions — sends BL code, title, status, priority, and a direct link.',
    'Marking a backlog item as Completed now backfills all skipped stages (Under Review, Approved, Planned, In Progress) with the finisher\'s name and timestamp.',
    'CEO/admin users receive an in-app notification when any backlog item is submitted — toggle on/off from Settings → Notifications.',
  ],
  changes: {
    added: [
      'Submitter name and date shown in backlog item detail page header.',
      'Copy description button with visual feedback on backlog item detail page.',
      'Share on WhatsApp button in Quick Actions sidebar.',
      'Stage backfill on COMPLETED: skipped intermediate stages stamped with finisher name + timestamp.',
      'inProgressById / inProgressAt fields track who moved item to In Progress; Activity Trail updated.',
      'CEO notification on backlog creation (APPROVAL_REQUIRED) sent to all users with backlog.ceo_center permission.',
      '"Notify CEO on New Backlog Item" toggle in Settings → Notifications.',
      'DB migration v23.1.0: adds backlogCeoNotify to system_settings and inProgressById/inProgressAt to ProductBacklogItem.',
    ],
    fixed: [],
    changed: [
      'Activity Trail In Progress step now shows who moved the item and when.',
      'Version bumped to 23.1.0',
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
