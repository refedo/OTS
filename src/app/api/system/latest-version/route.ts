import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '🛠️ HR Sidebar Cleanup, Loans/Custodies Pages, Employee Dashboard & Quick Task Improvements',
  highlights: [
    'Employee detail page redesigned: opens to a beautiful Overview tab with KPI tiles for loans, custodies, assets, and expiry alerts — edit form is now under the Record tab.',
    'Standalone /hr/loans and /hr/custodies pages: HR/admin sees all employees, regular users see their own.',
    'Public Holidays now embedded as a tab inside Leaves — removed from sidebar. Manpower Slots, New Employee removed from sidebar.',
    'HR Letters page navigation bug fixed: /hr/letters was missing from NAVIGATION_PERMISSIONS map.',
    'Quick Task dialog improved: "Assigned To" user picker + "Continue in Full Form" button carries data to /tasks/new.',
    'Asset location field added to asset form and schema. Roles list search bar added. Permissions page gets a second Save button at the top.',
  ],
  changes: {
    added: [
      '/hr/loans page: lists all employee loans for HR/admin; own loans for regular users',
      '/hr/custodies page: lists all custodies for HR/admin; own for regular users',
      'GET /api/hr/loans/all and GET /api/hr/custodies/all endpoints for standalone pages',
      'EmployeeOverviewTab: dashboard view with KPI tiles, loans/custodies/assets summary, expiry alerts',
      'Public Holidays tab embedded in /hr/leaves (replaces standalone sidebar entry)',
      'Asset location field: Prisma schema + add_asset_location.sql migration + form UI',
      'Quick Task dialog: "Assigned To" user picker and "Continue in Full Form" button',
      'Search bar in Roles list page',
      'Second Save button at top of role permissions page',
    ],
    fixed: [
      '/hr/letters missing from NAVIGATION_PERMISSIONS — caused letters page to be inaccessible after adding permissions',
    ],
    changed: [
      'Employee detail page default tab changed from Record to Overview dashboard',
      'Sidebar: New Employee, Manpower Slots, and Public Holidays entries removed; Loans and Custodies added',
      'Version bumped to 18.18.1',
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
