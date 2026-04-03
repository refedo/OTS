import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🏢 CEO Dashboard, Conversation Parity & Sidebar Reorganization',
  highlights: [
    '"Executive Command Center" renamed to "CEO Dashboard" — now appears in sidebar order settings',
    '8-week cash flow forecast added to CEO Dashboard with bar chart and weekly breakdown',
    'System Events and Governance Center moved to Settings section in sidebar',
    'Task-detail conversation fully upgraded: attachments, @mentions, #task refs, iMessage bubbles, 5s polling',
    'Global search fixed — Buildings and People categories now return results',
    'File attachment 404 fixed; PDF inline preview; image swipe navigation with tap-to-dismiss',
    'Time Extension now posts to conversation and navigates there',
  ],
  changes: {
    added: [
      '8-week cash flow forecast widget on CEO Dashboard — bar chart, opening/projected balance, weekly table',
      'Task-detail inline conversation: file attachments, @mentions, #task references, iMessage bubbles',
      '#task reference support in conversations — type # to search and link to any task',
      'Image lightbox in conversations: swipe left/right to navigate, tap to dismiss, counter badge',
      'PDF attachment inline preview in lightbox',
      'Time Extension dialog now posts request to task conversation and redirects there',
    ],
    fixed: [
      'Global search returned no results for Buildings and People — TypeScript interface now includes both categories',
      'File attachments returned 404 in production (missing basePath prefix) — resolved with path resolver',
      'Task-detail conversation was missing attachments, mentions, and updated styling — now has full feature parity',
    ],
    changed: [
      '"Executive Command Center" renamed to "CEO Dashboard" throughout the application',
      'System Events and Governance Center moved from Notifications to Settings sidebar section',
      '"CEO Dashboard" added to sidebar order drag-and-drop settings page',
      'Conversation polling in task detail reduced from 30s to 5s for near real-time updates',
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
