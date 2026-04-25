import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 25, 2026',
  type: 'minor' as const,
  mainTitle: 'Payroll Entitlement Adjustments',
  highlights: [
    'Record Annual Leave Allowance directly on a payroll period — amount is auto-computed from the employee\'s daily rate × number of days, and those days are automatically deducted from the annual leave balance.',
    'New Ticket Allowance adjustment kind lets HR pay travel ticket entitlements as a named line on the payslip.',
    'New Exit/Re-entry Visa Allowance adjustment kind covers visa cost reimbursements with a dedicated payslip label.',
    'Payslip PDFs now show each entitlement as a named earnings line (e.g. "Annual leave allowance (5 days)") instead of the generic "Other additions" bucket.',
    'Payroll period detail page now exposes the daily rate per employee and wires up the canAdjust permission for fine-grained access control.',
  ],
  changes: {
    added: [
      'ANNUAL_LEAVE_ALLOWANCE adjustment kind — amount = leaveDaysCompensated × dailyRate, leave balance auto-decremented',
      'TICKET_ALLOWANCE adjustment kind — manual SAR amount, named payslip line',
      'EXIT_REENTRY_VISA adjustment kind — manual SAR amount, named payslip line',
      'leaveDaysCompensated column on PayrollAdjustment (migration: add_payroll_entitlements.sql)',
      'Named entitlement rows in payslip PDF earnings section',
      'dailyRate field included in serialized PayrollLine on the period detail page',
      'adjustments array passed from server page to client component',
      'canAdjust prop wired through from hr.payroll.adjust permission',
    ],
    fixed: [
      'Payslip "Other additions" no longer lumps named entitlements into one opaque total',
    ],
    changed: [
      'Payroll adjustments API now accepts discriminated union schema (kind-specific fields)',
      'Annual leave balance ManualAdjustment decremented automatically when ANNUAL_LEAVE_ALLOWANCE is recorded',
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
