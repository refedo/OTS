import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '📎 Upload Preview & Task Workflow Improvements',
  highlights: [
    'Image attachments now show thumbnail preview before sending; upload progress bar tracks each file',
    'Send button activates with attachments alone — no text required',
    'Completion note is now mandatory for overdue tasks — serves as delay justification, posted to conversation',
    '"Ask for Clarification" navigates to the conversation after posting the message',
    'Conversations redesigned with iMessage-style bubbles, colored avatars, gradient sidebar',
    'Global search expanded — buildings, users, task search covers assignee, project, building',
    'Fixed Assets report fixed; GitHub sync closes issues on COMPLETED/DROPPED',
  ],
  changes: {
    added: [
      {
        title: 'Conversations (Task Messaging)',
        items: [
          'Real-time messaging on tasks — poll every 5 seconds for new messages',
          '@mention participants — triggers autocomplete, highlighted as blue pills',
          'File attachments — images show inline thumbnail; click to preview in lightbox popup',
          'Deep-link from mobile push notification to specific conversation',
          'New "Conversations" tab in notification panel',
        ],
      },
      'Global search now includes Buildings (by name/designation) and Users (by name/email/position)',
      'Task search now searches across assignee, requester, building designation, project number, and description',
      'Fixed Assets section in Assets report now correctly loads fixed asset accounts',
      'Backlog GitHub sync — COMPLETED/DROPPED items now close the GitHub issue automatically',
    ],
    fixed: [
      'Sign out required 4–5 clicks due to catastrophic clearTimeout loop freezing the browser — fixed',
      'Conversation image attachments returned 404 in production (missing basePath prefix) — fixed',
      'Backlog notes 500 error — Next.js 15 params are Promises, now awaited correctly',
      'AI Assistant sidebar showing despite being deselected in role — navPermissions field now used for sidebar',
      'System events 403 error for non-admin users — permission check corrected',
    ],
    changed: [
      'Integrations page moved under Settings sidebar section',
      'Backlog navigation skips COMPLETED and DROPPED items',
      'Notification polling interval reduced to 1 minute for faster badge updates',
      'Assembly part designation is now a clickable link to the detail page',
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
