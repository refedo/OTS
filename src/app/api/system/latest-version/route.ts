import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'PTS Sync History Improvements & Project Dashboard Task Fixes',
  highlights: [
    'PTS Sync History dialog is now fully responsive — no more left/right scrolling on mobile; expands to full screen height',
    'New per-building consent checkboxes before syncing: choose exactly which new buildings OTS should create',
    'Fixed task display and classification issues in the project dashboard view',
  ],
  changes: {
    added: [
      {
        title: 'New Buildings Consent Prompt',
        items: [
          'Amber consent section in PTS Sync execute lists every unmatched building for selected projects, each with its own checkbox',
          'Select All / None quick-action buttons accept or reject all pending new-building creations at once',
          '"Map Instead" shortcut opens the building mapping dialog directly from the consent section',
          'Live count line: "X of Y new buildings will be created", updates in real time as boxes are checked',
        ],
      },
    ],
    fixed: [
      {
        title: 'PTS Sync History Dialog',
        items: [
          'Removed min-w-[900px] table constraint — table now fits the screen without left/right scrolling',
          'Dialog uses max-h-[92vh] with vertical-only scroll, showing more history rows without clipping',
          'Shorter date format (M/D/YY, h:mm AM/PM) saves column space',
          'Project lists truncate at 4 entries with "+N more" indicator',
          'Duration and User columns hidden on small screens',
        ],
      },
      {
        title: 'Project Dashboard Tasks',
        items: [
          'Tasks now display correctly with accurate activity grouping after main-activity schema corrections',
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
