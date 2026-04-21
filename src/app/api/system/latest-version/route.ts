import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 21, 2026',
  type: 'minor' as const,
  mainTitle: 'Employee Self-Profile Access & PBAC Activation',
  highlights: [
    'Employees can now view their own HR profile at /hr/employees/me — accessible from the dashboard "Full Profile" button and the new "My Profile" sidebar entry. Read-only, no compensation fields.',
    'Six new viewOwn permissions scope HR access to own records only: hr.employee.viewOwn, hr.loans.viewOwn, hr.custodies.viewOwn, hr.assets.viewOwn, hr.violations.viewOwn, hr.letters.viewOwn.',
    'PBAC activated for all linked employees: self-service grants written to customPermissions for every user with an employeeId. Run scripts/run-permission-sync.js to activate on an existing installation.',
    'New RBAC+PBAC sync script (scripts/sync-rbac-and-activate-pbac.ts) idempotently merges role bundles and activates PBAC — safe to re-run at any time.',
    'Permission matrix editor now has a live search — filter by permission name, description, or ID with per-category match counts.',
  ],
  changes: {
    added: [],
    fixed: [],
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
