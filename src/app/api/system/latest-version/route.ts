import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 21, 2026',
  type: 'patch' as const,
  mainTitle: 'Employee Profile Tabs, Self-Service Dashboard & Excel Import',
  highlights: [
    'Employee profile page now has Contracts, Training, Onboarding, Announcements, Circulations, and Car Maintenance tabs — all accessible from /hr/employees/[id].',
    'Assets and Car Maintenance tabs are conditionally hidden when an employee has no asset assignments.',
    'New Dashboard tab on employee profile is a one-stop self-service hub: request a loan, custody, or leave; read company policies; and request an employment certificate — all without navigating away.',
    'Employee list page now supports bulk Excel import — drag-and-drop the same file produced by the export, with column mapping, validation, and upsert by Employment ID.',
    'Fixed: /hr/loans, /hr/custodies, and /hr/traffic-violations pages now correctly allow access for users with viewOwn permissions (hr.loans.viewOwn, hr.custodies.viewOwn, hr.violations.viewOwn).',
  ],
  changes: {
    added: [
      'Employee profile Contracts tab',
      'Employee profile Training tab',
      'Employee profile Onboarding tab (interactive checklist)',
      'Employee profile Announcements tab',
      'Employee profile Circulations tab',
      'Employee profile Car Maintenance tab (conditional on asset assignments)',
      'Employee profile Dashboard tab (self-service hub)',
      'Excel import for employee list (/api/hr/employees/import)',
    ],
    fixed: [
      '/hr/loans inaccessible to users with hr.loans.viewOwn',
      '/hr/custodies inaccessible to users with hr.custodies.viewOwn',
      '/hr/traffic-violations inaccessible to users with hr.violations.viewOwn',
      'Assets tab shown even when employee has no asset assignments',
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
