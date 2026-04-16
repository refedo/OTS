import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '✉️ HR Module Enhancements — Letters, Vacation Balance & Date Fixes',
  highlights: [
    'Letters & Correspondence system: 16 letter types (QUESTIONING, FIRST_WARNING, DISMISSAL, SALARY_CERTIFICATE…), INTERNAL/EXTERNAL classification, auto-numbered INT-YY-NNNN / EXT-YY-NNNN with race-condition-safe generation.',
    'Vacation Balance tab in Leave Management shows entitled days (1.75/month from contract date) and approved consumed days per leave category for every active employee.',
    'All Gregorian dates fixed — en-SA locale (which renders Hijri on Saudi devices) replaced with en-GB throughout assets, contracts, and all HR tables.',
    'Asset list view toggle: switch between card grid and compact table view; preference persisted in localStorage.',
    'Sidebar cleanup: Attendance Sync, Dolibarr Sync, and Identity Reconciliation removed from sidebar navigation — these tools remain accessible from their tabs inside HR Setup.',
  ],
  changes: {
    added: [
      'HrLetter Prisma model + HrLetterType enum (16 types) + HrLetterClass enum (INTERNAL/EXTERNAL); idempotent migration at prisma/manual_migrations/add_hr_letters.sql',
      'GET/POST /api/hr/letters — list with filters + create with 5-attempt retry loop for P2002 unique-constraint race conditions on auto-number',
      'GET/PUT/DELETE /api/hr/letters/[id] — single letter CRUD with soft delete',
      '/hr/letters page with indigo/blue gradient hero, 4 KPI tiles, full letter table, create/edit dialog (inline write or PDF attachment), and view dialog',
      'hr.letters.view + hr.letters.manage permissions — both added to HR role bundle',
      'Letters & Correspondence entry added to HR sidebar section',
      'GET /api/hr/vacation-entitlement — returns per-employee entitled days (1.75/month × months since dateOfJoining) and consumed days per leave type from approved leave requests',
      'Vacation Balance tab in /hr/leaves (visible to canViewAll users): 4 KPI tiles, searchable table with entitled/consumed/remaining columns per leave type, negative balance highlighted in rose',
    ],
    fixed: [
      'Asset license expiry and all asset dates now render as Gregorian (en-GB) instead of Hijri — root cause was toLocaleDateString("en-SA") which uses Islamic calendar on Saudi locale',
      'Payroll periods list now shows a proper error message when the API returns a non-OK status (previously silently showed empty state)',
      'Contracts table Hijri sub-line removed from expiry date column — only Gregorian date shown; Hijri input still available in create/edit dialog',
    ],
    changed: [
      'Asset list gains grid/table view toggle (LayoutGrid / LayoutList icons), view mode persisted to localStorage under hr-assets-view-mode',
      'HR sidebar: removed Attendance Sync, Dolibarr Sync, Identity Reconciliation menu items — accessible via HR Setup tabs',
      'Sidebar order page DEFAULT_SECTIONS now includes HR section',
      'Version bumped to 18.17.0',
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
