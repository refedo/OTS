import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔍 Conversation Search, Unread Indicators & Mobile File Fix',
  highlights: [
    'Search bar in the conversation list — filter by title, topic, participant name, or message content instantly',
    'Unread indicator — orange dot and bold text mark conversations with new messages you haven\'t read yet',
    'Conversations auto-mark as read when you open them',
    'File attachments now open in a new tab on mobile so you can close the tab and return to OTS',
  ],
  changes: {
    added: [
      'Search input in the conversation list sidebar — real-time client-side filtering',
      'lastReadAt field on conversation participants (both task and standalone)',
      'PATCH /api/conversations/[id]/read and PATCH /api/tasks/[id]/conversation/read — mark-as-read endpoints',
      'hasUnread flag in GET /api/conversations response',
    ],
    fixed: [
      'Non-image attachments now open with target="_blank" so mobile users can close tab and return to OTS',
      'Message input placeholder crashed for standalone conversations — now uses correct topic field',
    ],
    changed: [
      'Unread conversations highlighted with orange dot, bold title, and orange timestamp',
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
