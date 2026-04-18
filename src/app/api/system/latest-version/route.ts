import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version: pkgVersion } = require('../../../../../package.json') as { version: string };

const CURRENT_VERSION = {
  version: pkgVersion,
  date: 'April 19, 2026',
  type: 'minor' as const,
  mainTitle: 'Employee Widget Fix, Leave Balances, Loan Payments & Attendance Monthly Grid',
  highlights: [
    'Employee Self-Service widget now linkable to any user via Edit User — CEO and all staff can see their HR profile on the dashboard.',
    'Leave balance tracker added to the dashboard widget (Leaves tab) and auto-computed per leave type for the current year.',
    'Loan payments can now be recorded manually — choose Scheduled (standard installment) or Adjusted (custom amount); loan auto-completes when fully paid.',
    'Attendance page gains a Monthly Grid tab: employees as rows, days as columns, color-coded by status (Present/Absent/Vacation/Sick/Weekend/Holiday).',
  ],
  changes: {
    added: [
      'Employee Self-Service widget: link any user to an employee record via Users → Edit User → Linked Employee Record field',
      'Dashboard widget Leaves tab: shows leave balance per type (available, accrued, used) with a progress bar',
      'Loan payments: Record Payment dialog on the Loans page — Scheduled (uses installmentAmount) or Adjusted (custom SAR) with auto-complete when fully paid',
      'POST /api/hr/loans/[id]/payments and GET /api/hr/loans/[id]/payments endpoints',
      'Attendance Monthly Grid tab at /hr/attendance — month/year navigator, employees as rows, days 1–31 as columns, color-coded abbreviations (P/AP/A/AV/SL/WE/PH), summary columns (Present/Absent/Vacation)',
      'GET /api/hr/attendance/grid?year=YYYY&month=MM endpoint',
    ],
    fixed: [],
    changed: [
      'User edit form now includes an employee picker so any user account can be linked to an HR employee record',
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
