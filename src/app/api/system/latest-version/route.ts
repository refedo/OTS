import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔍 Global Search Fix, Coating KPI & LCR Display Corrections',
  highlights: [
    'Global search now works — each category (tasks, projects, NCRs…) searched independently; one failing model no longer blocks all results',
    'Coating percentage in Project Tracker is now correct — only averages processes that have actual production data',
    'LCR comparison now shows the right LCR1 / LCR2 suppliers and amounts (column mapping was offset)',
    'LCR page is cleaner — date filters removed, Project/Status stacked vertically',
  ],
  changes: {
    added: [],
    fixed: [
      'Global search returned no results for any query — Promise.all failed when optional models (Initiatives, NCRs, etc.) threw; now each category is independent',
      'Coating KPI in project tracker showed average of sandblasting+painting+galvanization even when only one was applicable — now skips processes with zero data',
      'LCR comparison table: LCR1 was using awardedToRaw (wrong field) — now correctly uses lcr2/lcr2Amount which maps to the first supplier in the sheet',
    ],
    changed: [
      'LCR header: removed Needed By From/To date filters',
      'LCR header: Project and Status dropdowns now stacked vertically for cleaner layout',
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
