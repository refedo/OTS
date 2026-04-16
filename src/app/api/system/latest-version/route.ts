import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🔧 Payroll Revert, Attendance Consolidation, Search Expansion & Quick Task',
  highlights: [
    'Payroll approval can now be reverted (APPROVED → CALCULATED) — new "Revert Approval" button for HR managers who need to re-calculate before locking.',
    'Attendance page consolidated: Records, Mapping, and Timesheet are now tabs on /hr/attendance — Attendance Mapping and Employee Timesheet removed from sidebar.',
    'Global search (Ctrl+K) now covers HR: Employees, Assets, Contracts, and HR Letters searchable alongside tasks, projects, and NCRs.',
    '+ Quick Task button added to the top bar (Ctrl+Shift+T): create a task with title, priority, and due date without leaving any page.',
    'HR letters migration auto-runs on server boot via startup-migrations; agencies page marked force-dynamic to fix refresh loop.',
  ],
  changes: {
    added: [
      'POST /api/hr/payroll-periods/[id]/unapprove: reverts APPROVED → CALCULATED, requires hr.payroll.approve',
      '"Revert Approval" button in payroll period detail page (amber-outlined, visible only for APPROVED periods)',
      'AttendanceTabsClient: three-tab wrapper at /hr/attendance (Records | Mapping | Timesheet)',
      'QuickTaskDialog: + button in TopBar with Ctrl+Shift+T shortcut, submits to POST /api/tasks',
      'Global search HR entities: employees, assets, contracts, hrLetters in /api/search and GlobalSearch',
      'add_hr_letters.sql added to STARTUP_MIGRATIONS in startup-migrations.ts',
    ],
    fixed: [
      'Agencies page: force-dynamic added to fix apparent refresh/reload loop',
      'Payroll list now shows API error messages on non-OK responses',
    ],
    changed: [
      '"Employee Timesheet" and "Attendance Mapping" sidebar entries removed; content in /hr/attendance tabs',
      'Version bumped to 18.18.0',
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
