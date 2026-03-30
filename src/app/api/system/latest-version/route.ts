import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔧 Bug Fixes & Improvements',
  highlights: [
    'Sidebar Order settings — Admin/CEO can drag-and-drop reorder sidebar sections globally',
    'Project Status Tracker moved to top-level sidebar navigation',
    'Task Cancelled status no longer returns invalid input error',
    'Production Trend defaults to monthly view and shows average per active day for Top Processes',
  ],
  changes: {
    added: [
      {
        title: 'Sidebar Order Settings',
        items: [
          'New page at /settings/sidebar for Admin and CEO users',
          'Drag-and-drop reordering of all sidebar navigation sections via @dnd-kit',
          'Order stored globally on the server — applies to all user accounts',
          'Sidebar Order link added to the Settings navigation group',
        ],
      },
      'Project Status Tracker link moved from Projects section to top-level sidebar (alongside Dashboard, Early Warning, AI Assistant)',
      'Revision and Consultant Code columns in the Tasks table are now sortable',
    ],
    fixed: [
      'Task status "Cancelled" was rejected as invalid input — added Cancelled to the status enum in create and update API schemas',
      'CEO/Admin dashboard now shows ALL projects and objectives, not just the ones assigned to their account',
      'Production Trend Top Processes now shows average weight per active day instead of cumulative total',
    ],
    changed: [
      'Production Trend default period changed from Week to Month',
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
