import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { TrafficViolationsClient } from '@/components/hr/traffic-violations-client';

export default async function TrafficViolationsPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canView = permissions.includes('hr.violations.view') || permissions.includes('hr.violations.manage');
  if (!canView) redirect('/unauthorized?from=/hr/traffic-violations');

  return (
    <TrafficViolationsClient
      canManage={permissions.includes('hr.violations.manage')}
    />
  );
}
