import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🏗️ Project Scope & Status Tracker + UX Improvements',
  highlights: [
    'Project Status Tracker now shows ALL task states — open, in-progress, completed, released, and approved — with score-based progress bars',
    'Weekly Issues: click any Kanban card to preview full details; drag-and-drop cards between columns on desktop AND mobile',
    'Task detail timeline circles aligned on a single horizontal baseline for cleaner readability',
    'Project Setup Wizard supports Scope of Work per building with configurable contractual activities',
  ],
  changes: {
    added: [
      {
        title: 'Weekly Issues UX',
        items: [
          'Click any Kanban card or table row → read-only preview dialog with full issue details',
          'Desktop drag-and-drop between status columns with optimistic status update',
          'Mobile touch drag-and-drop with ghost element that follows the finger',
        ],
      },
      {
        title: 'Scope of Work System',
        items: [
          'ScopeOfWork & BuildingActivity models — multiple scopes per building with configurable activities',
          'Wizard Step 3 (Scope of Work) and Step 4 (Activities) in the 9-step project wizard',
          '/project-tracker with dark/light theme, real-time progress, 60s auto-refresh',
        ],
      },
    ],
    fixed: [
      'Project tracker: all task-based columns (ARCH DRAWING, DESIGN STAGE, SD APPROVAL, etc.) now show real progress — were showing 0% due to broken query filter',
      'Open / in-progress / completed tasks all contribute to tracker progress (not just approved/released)',
      'Task detail timeline: circles now aligned on one horizontal line regardless of label or date length',
    ],
    changed: [
      'Wizard restructured from 7 to 9 steps with dedicated Scope of Work and Activities steps',
      'RBAC: project_tracker.view and project_tracker.export permissions added',
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
