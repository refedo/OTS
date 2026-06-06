import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'June 5, 2026',
  type: 'minor' as const,
  mainTitle: 'Stability Hardening, Projects & HR Enhancements',
  highlights: [
    'Saudi Labor Law unauthorized-absence alerts & escalation (OTS-BL-080): automated HR compliance escalation — HR → manager → CEO.',
    'Aging Report minimum-amount filter: exclude small balances from the aged receivables view.',
    'Projects wizard edit mode: re-enter the creation wizard to edit an existing project; new review step; redesigned project details page.',
    'PM2 memory limits raised to actual 7.8GB host capacity — ending the OOM restart loop.',
    'Full OOM root-cause and culprit-attribution diagnostics: 5s RSS sampling, persisted state file, in-flight request tracking, Prisma query shape counting.',
    'Tasks: Discussion-type tasks now visible; isCeoTask NULL filter removed; filter dropdowns open upward; SearchableSelect uses React portal.',
    'Project Tracker: tonnage aggregated in SQL; in-flight deduplication and 60s cache; null-building tasks excluded from per-building progress.',
  ],
  changes: {
    added: [
      'Saudi Labor Law unauthorized-absence alerts (OTS-BL-080): automated escalation workflow — HR → manager → CEO — with override flags and audit trail.',
      'Aging Report: minimum-amount filter to exclude small receivable balances.',
      'Projects: wizard edit mode — re-enter creation wizard to edit existing projects.',
      'Projects: new Review step in the project creation/edit wizard.',
      'Projects: redesigned project details page.',
    ],
    fixed: [
      'OOM restart loop — root-cause diagnostics: 5s RSS sampling, SIGINT/SIGHUP handlers, heap snapshot on threshold, V8 near-heap-limit backstop.',
      'OOM restart loop — culprit attribution: per-process counters persisted to state file; in-flight request tracking; Prisma queries counted by shape.',
      'PM2 memory limits raised to actual 7.8GB host — prior limit was too low and caused needless restarts.',
      'Heap snapshot watchdog: heapsnapshots/ directory bounded so it cannot fill the host disk.',
      'Server crash on broken links: navigation to broken links no longer kills the Node process.',
      'SessionProvider: network/server errors no longer trigger a PM2 restart loop.',
      'Session expiry on contract save: redirect handled gracefully.',
      'Tasks: Discussion-type tasks now visible in the task list.',
      'Tasks: isCeoTask NULL silent filter removed.',
      'Tasks: scope dropdown now visible in edit mode; API response aligned with form.',
      'Tasks: filter dropdowns open upward to prevent viewport clipping.',
      'Tasks: SearchableSelect uses React portal to escape stacking context.',
      'Tasks: createPortal import fixed — was from react instead of react-dom.',
      'Project Tracker: tonnage aggregated in SQL (eliminates N+1 full-table scan).',
      'Project Tracker: in-flight deduplication and 60s cache.',
      'Project Tracker: null-building tasks excluded from per-building progress.',
      'Inventory: missing unit_cost / total_cost columns repaired on inv_stock_ledger.',
      'Inventory: reference_no migration and camelCase column name fixes.',
      'Build: server-only Prisma client chain no longer leaks into the client bundle.',
      'Polling: underperforming-schedules moved from every 60s to once per day.',
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
