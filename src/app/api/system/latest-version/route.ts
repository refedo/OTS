import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

// This should match the latest version in changelog
const CURRENT_VERSION = {
  ...APP_VERSION,
  mainTitle: '👷 HR / Payroll Module Launch — Phase 1: HR Foundation & Master Data',
  highlights: [
    'First-ever native HR schema — Employee, Agency, ManpowerSlot, SystemConfig — makes OTS the single source of truth for the employee master',
    'One-way read-only Dolibarr employee mirror with preserve-on-edit policy (manuallyEditedFields skip-list)',
    'One-time identity reconciliation wizard at /admin/identity-reconciliation links existing OTS users to Dolibarr llx_user before the first sync runs',
    'Breaking change: every new User must now link to an unlinked Employee row — the user creation form enforces this',
    'Major version bump marks the transition from steel-fabrication-only ERP to a unified fabrication + workforce platform',
  ],
  changes: {
    added: [
      'HR schema: Employee, Agency, ManpowerSlot, DolibarrEmployeeSyncLog, SystemConfig models (UUID + AssemblyPart audit pattern)',
      'HR CRUD UI under /hr/employees, /hr/agencies, /hr/manpower-slots with bilingual EN/AR paired fields and SA IBAN validation',
      'Employee form: tabbed layout (Personal / Employment / Compensation / Banking) with React-Hook-Form + Zod, compensation-field gating, per-employee Reset-to-Dolibarr escape hatch',
      '/hr/employees/sync page with sync button + full run history (hidden until reconciliation gate flips)',
      '/admin/identity-reconciliation one-time wizard with per-row Dolibarr user picker and progress counter',
      'Dolibarr client extended with getUsers / getUserById / getAllUsers methods',
      'Preserve-on-edit sync service honouring manuallyEditedFields and writing every run to DolibarrEmployeeSyncLog',
      '11 new hr.* permissions plus admin.identity.reconcile, merged into the runtime HR role via one-shot patch script',
      'Bulk manpower-slot creation endpoint generates slot codes like SH-W01..SH-W05 from prefix + start number',
    ],
    fixed: [],
    changed: [
      'Breaking: POST /api/users now requires an employeeId — returns 400 EMPLOYEE_NOT_FOUND / 409 EMPLOYEE_ALREADY_LINKED on violations',
      'User creation form now surfaces an unlinked-Employee dropdown and blocks submission until one is selected',
      'Version bumped to 18.0.0 — major bump reflecting the domain-model expansion and the breaking user-creation contract change',
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
