import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';

export const dynamic = 'force-dynamic';

/**
 * /hr/attendance/timesheet — landing page.
 *
 * The timesheet view itself lives at /hr/attendance/timesheet/EMPLOYEE/<id>
 * (or /MANPOWER_SLOT/<id>). This page exists so the sidebar entry "Employee
 * Timesheet" can link to a stable URL without needing to know which employee
 * to show. It redirects to the first active employee; the client-side
 * EmployeePicker in the timesheet header then lets the user hop to any other
 * employee without returning here.
 */
export default async function TimesheetLandingPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.attendance.view');
  if (!canView) redirect('/unauthorized?from=/hr/attendance/timesheet');

  const first = await prisma.employee.findFirst({
    where: { deletedAt: null, status: 'ACTIVE' },
    select: { id: true },
    orderBy: { fullNameEn: 'asc' },
  });

  if (!first) {
    // No active employees — send the user to the employee list so they can add one.
    redirect('/hr/employees');
  }

  redirect(`/hr/attendance/timesheet/EMPLOYEE/${first.id}`);
}
