import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Dashboard Widgets: Product Backlog & Weekly Issues',
  highlights: [
    'New Product Backlog dashboard widget — active/blocked/pending counts, priority breakdown, and recent active backlog items',
    'New Weekly Issues dashboard widget — open/in-progress counts, overdue alert, and recent open issues from weekly meetings',
    'Two new summary API routes power the widgets with real-time aggregated data',
  ],
  changes: {
    added: [
      {
        title: 'Product Backlog Widget',
        items: [
          'BACKLOG widget type available in the Add Widget dialog on the dashboard',
          'Status tiles: Active (In Progress + Planned + Approved), Blocked, Pending (Idea + Under Review)',
          'Priority grid showing Critical / High / Medium / Low counts',
          'List of up to 5 recent non-completed backlog items with code, title, status badge, and link',
          'Auto-refreshes every 2 minutes; violet left-border accent',
        ],
      },
      {
        title: 'Weekly Issues Widget',
        items: [
          'WEEKLY_ISSUES widget type available in the Add Widget dialog on the dashboard',
          'Open and In Progress status tiles with counts',
          'Overdue alert banner shown when issues have passed their due date',
          'Priority grid showing Critical / High / Medium / Low counts',
          'List of up to 5 recent open issues with issue number, status badge, department name, and link',
          'Auto-refreshes every 2 minutes; rose left-border accent',
        ],
      },
      {
        title: 'New API Routes',
        items: [
          'GET /api/dashboard/backlog/summary — aggregates ProductBacklogItem by status and priority; returns active, blocked, pending totals and 5 recent non-completed items',
          'GET /api/dashboard/weekly-issues/summary — aggregates WeeklyIssue by status and priority; returns overdue count and 5 recent open issues',
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
