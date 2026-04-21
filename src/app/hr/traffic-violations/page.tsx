import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { TrafficViolationsClient } from '@/components/hr/traffic-violations-client';
import prisma from '@/lib/db';

export default async function TrafficViolationsPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canView = permissions.includes('hr.violations.view') || permissions.includes('hr.violations.manage');
  const canViewOwn = permissions.includes('hr.violations.viewOwn');
  if (!canView && !canViewOwn) redirect('/unauthorized?from=/hr/traffic-violations');

  let ownEmployeeId: string | null = null;
  if (!canView && canViewOwn) {
    const user = await prisma.user.findUnique({
      where: { id: session!.sub },
      select: { employeeId: true },
    });
    ownEmployeeId = user?.employeeId ?? null;
  }

  return (
    <TrafficViolationsClient
      canManage={permissions.includes('hr.violations.manage')}
      viewOwnEmployeeId={ownEmployeeId}
    />
  );
}
