import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: 'Backlog Task Management & Activity Trail',
  highlights: [
    'Linked tasks are now fully manageable — change status, reopen, and delete tasks directly from the backlog detail page',
    'Live progress percentage updates in real time as tasks are completed or reopened',
    'Activity Trail now merges status milestones with task events chronologically',
  ],
  changes: {
    added: [
      {
        title: 'Backlog Task Management',
        items: [
          'Task status toggle (circle button + dropdown) on each linked task row — Pending, In Progress, Completed',
          'Task delete button with confirmation dialog',
          'PATCH /api/backlog/[id]/tasks/[taskId] — in-context task update (status, title, description, priority)',
          'DELETE /api/backlog/[id]/tasks/[taskId] — task removal scoped to its parent backlog item',
          'Live progress percentage in the Progress sidebar card',
          'Task audit events written to AuditLog when tasks are created, completed, reopened, or deleted',
          'Dynamic Activity Trail merging status milestones and task events chronologically with color-coded icons',
          'GET /api/backlog/[id] now returns activityLogs for live activity trail',
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
