import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 18, 2026',
  type: 'minor' as const,
  mainTitle: 'UI Color System Redesign & Typography Standardization',
  highlights: [
    'Steel-blue brand system replaces the fully-grayscale palette — primary is now blue-600, sidebar is deep navy with sky-blue active pills.',
    'Conversation status colors: task-linked conversations show a color-coded left border (Completed=green, In Progress=blue, Delayed=red, Pending=amber, Waiting=violet).',
    'Archive and Delete actions added to conversations via a hover context menu — persisted per-user in the database.',
    'Employee Self-Service widget on the Dashboard completely redesigned with gradient hero banner, KPI strip, and 7-tab layout.',
  ],
  changes: {
    added: [
      'Conversation status color coding: left border and status badge on each task-linked conversation item',
      'Archive conversations: hover any conversation to reveal Archive/Unarchive via context menu',
      'Delete conversations: standalone discussions can be soft-deleted by their creator',
      '"Show archived" toggle in the conversations sidebar reveals hidden threads',
      'Employee Dashboard Widget redesigned: Assets, Finance (loans+custodies), Payslips, Violations, Letters, Contracts tabs',
      'Typography defaults for h1–h4 added to @layer base',
      'TopBar frosted-glass strip: bg-background/80 backdrop-blur-sm',
    ],
    fixed: [
      'ecosystem.config.js: explicit cwd so PM2 always runs from the correct app directory',
    ],
    changed: [
      'Primary color updated to blue-600 oklch(0.546 0.245 264)',
      'Sidebar background switched to deep navy bg-sidebar oklch(0.19 0.06 264)',
      'All muted/secondary/accent tokens gain subtle blue chroma',
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
