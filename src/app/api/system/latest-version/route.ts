import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '✏️ Message Editing, LCR Supplier Fix, Shipment Count & Conversation Cleanup',
  highlights: [
    'Edit your own messages within 1 minute of sending — pencil icon appears on hover in both conversations page and task detail panel',
    'LCR comparison table now shows the correct supplier names: LCR1/LCR2/LCR3 each map to their proper sheet columns',
    'Project tracker dispatch detail now shows number of shipments alongside shipped weight and percentage',
    'Standalone conversations no longer create phantom "Discussion" tasks that clutter the task list',
  ],
  changes: {
    added: [
      'Message editing: PATCH /api/tasks/[id]/messages/[messageId] — author-only, within 1 minute, shows "(edited)" label after save',
      'Shipment count in project tracker dispatch popup — shows how many dispatch log entries exist per building',
      'lcr1 supplier name field added to LcrEntry schema — LCR sync now reads supplier name from the correct sheet column (col 24)',
    ],
    fixed: [
      'LCR comparison table had column mapping offset: what was displayed as LCR2 was actually LCR1, and LCR3 was LCR2 — now correctly mapped',
      'Standalone conversations were creating a Discussion task behind the scenes — those tasks are now hidden from the task list',
    ],
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
