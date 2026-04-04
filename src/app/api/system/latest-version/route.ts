import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '💬 Conversation Improvements, PTS Sync Fix & Bookmarks Persistence',
  highlights: [
    'Start conversations without a task — enter a topic/purpose to create a standalone discussion thread',
    'Invite people upfront when starting a new conversation, before sending the first message',
    'Invitee search in task-detail conversation — no more scrolling the full user list',
    'Bookmarks now survive logout — preserved across sessions on the same device',
    'PTS full sync no longer times out — eliminated N+1 DB queries for dramatically faster sync',
    '#task references now render as clickable links in the main Conversations page',
  ],
  changes: {
    added: [
      'Topic-only conversations — start a group discussion without linking to a task',
      'Invitee picker in "New Conversation" form — search and add participants before sending the first message',
      '#task link rendering in /conversations message bubbles (already worked in task-detail)',
    ],
    fixed: [
      'Bookmarks cleared on logout because localStorage.clear() wiped everything — bookmarks now preserved',
      'PTS full sync 504 gateway timeout — preloads all existing logs in one query instead of N+1 per row',
      'Invitee panel in task-detail conversation had no search — now searchable by name',
    ],
    changed: [
      '"Select a task" in new conversation form is optional — use topic field for standalone discussions',
      'PTS log sync reduced from ~3 DB queries per row to 1; existing logs preloaded in a single query',
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
