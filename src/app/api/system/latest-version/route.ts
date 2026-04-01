import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '📊 Financial UX & Deploy Optimizations',
  highlights: [
    'Aging Report redesigned — AR/AP toggles, 6 bucket summary cards (Current/1-30/31-60/61-90/90+/Total), color-coded columns matching SOA style',
    'Statement of Account — Overdue Balance (past-due only) and Total Outstanding (all unpaid) shown separately; Credit Limit card with headroom/over-limit indicator',
    'Balance Sheet — year selector dropdown (5 years back) alongside custom date input for faster period navigation',
    'Financial Settings — stale account code detection with amber warnings when stored codes are missing from COA; re-sync guidance',
    'Backlog attachments — images and PDFs now open inline in the browser (Eye icon); no forced download',
    'Deploy workflow — conditional npm ci / prisma generate, pm2 reload for zero-downtime, faster build cache',
  ],
  changes: {
    added: [
      {
        title: 'Aging Report redesign',
        items: [
          'AR/AP toggle buttons matching SOA green/red style',
          '6 bucket summary stat cards: Current (green), 1-30 (yellow), 31-60 (orange), 61-90 (red), 90+ (dark red), Total',
          'Color-coded table columns per aging bucket',
          'Invoice-level expand rows with overdue days in red/green',
          'Mobile-responsive: mid-range bucket columns hidden on small screens',
        ],
      },
      'Statement of Account — Credit Limit card showing outstanding_limit from Dolibarr; over-limit shown in red, headroom in green',
      'Balance Sheet — year selector (5 years back) sets as_of_date to Dec 31 of selected year',
      'Financial Settings — per-field stale code badges and summary warning banner with re-sync guidance',
      'DB migration add_is_locked_journal_entries.sql — fixes Manual Journal Entries on legacy production databases',
    ],
    fixed: [
      'Manual Journal Entries not saving on production — is_locked column was missing from fin_journal_entries on databases predating the column addition',
      'SOA Outstanding showing same number as Overdue — SOA lines now carry dateDue; Overdue Balance (past-due) and Total Outstanding (all unpaid) are now separate',
      'Backlog attachments forced download — images and PDFs now served inline (Content-Disposition: inline) and open in new tab',
    ],
    changed: [
      'Deploy cache key — now keyed only on package-lock.json hash; webpack module cache reused across code-only commits (~30-40% faster builds)',
      'Deploy npm ci — now conditional on package.json hash change; prisma generate conditional on schema.prisma hash change (saves ~1-2 min per deploy)',
      'Deploy restart — pm2 reload (zero-downtime hot reload) replaces pm2 stop + pm2 restart',
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
