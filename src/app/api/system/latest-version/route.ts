import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '💬 Standalone Conversations, File Download Fix, Notification Links & Share',
  highlights: [
    'Standalone conversations are now a proper independent module — no phantom tasks created behind the scenes',
    'Excel (.xlsx) and other non-image files now download correctly on mobile — no more .xlsx.html extension issue',
    'Conversation notification clicks now open the Conversations page directly at the right thread',
    'Share button in conversation header — copy link to clipboard or open in WhatsApp',
  ],
  changes: {
    added: [
      'New Conversation model (conversations, conversation_messages, conversation_participants tables) — standalone conversations no longer depend on the Task model',
      'New API routes: POST/GET /api/conversations/[id]/messages, PATCH /api/conversations/[id]/messages/[messageId], GET/POST/DELETE /api/conversations/[id]/participants',
      'GET /api/file/[...path] — serves uploads with explicit Content-Type + Content-Disposition headers to fix mobile download extension issue',
      'Share button (clipboard copy + WhatsApp) in conversation header for both task-linked and standalone conversations',
    ],
    fixed: [
      '.xlsx (and other document) attachments downloaded as .xlsx.html on mobile — now served through /api/file/ which sets correct headers',
      'Conversation notification clicks navigated to Dashboard — now routes to /conversations?taskId=... or /conversations?id=... correctly',
      'Standalone conversations created a "Discussion" Task as a container — now use the dedicated Conversation model',
    ],
    changed: [
      'Conversation list now shows both task-linked conversations and standalone discussions in one feed',
      'Standalone conversations shown with chat bubble icon in the list; task conversations retain the task initial',
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
