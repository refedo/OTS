import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Global Search Bar',
  highlights: [
    'New persistent search icon in the top-right bar — search the entire system from any page with a single click or Ctrl+K',
    'Searches Tasks, Projects, Initiatives, Weekly Issues, Backlog Items, NCRs, RFIs, and Assembly Marks simultaneously',
    'Categorized results with color-coded icons, status badges, and full keyboard navigation (↑↓ / Enter / Esc)',
  ],
  changes: {
    added: [
      {
        title: 'Global Search Bar',
        items: [
          'Search icon button fixed to the top-right navigation bar, next to the notification bell and logout — visible on every authenticated page',
          'Ctrl+K keyboard shortcut opens the search dialog from anywhere in the system',
          'GET /api/search?q= endpoint runs 8 parallel Prisma queries across all major entity types; returns up to 5 results per category',
          'Results grouped by entity type: Tasks, Projects, Initiatives, Weekly Issues, Backlog Items, NCRs, RFIs, Assembly Marks',
          'Color-coded category icons and status badges on every result row',
          'Keyboard navigation: ↑↓ to move between results, Enter to open, Esc to close',
          '300 ms debounce and 2-character minimum prevent unnecessary API calls',
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
