import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { AttendanceListClient } from '@/components/hr/attendance-list-client';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.attendance.view');
  if (!canView) redirect('/unauthorized?from=/hr/attendance');

  return <AttendanceListClient />;
}
