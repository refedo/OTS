import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { CarMaintenanceClient } from '@/components/hr/car-maintenance-client';

export default async function CarMaintenancePage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canView = permissions.includes('hr.carMaintenance.view') || permissions.includes('hr.carMaintenance.manage');
  if (!canView) redirect('/unauthorized?from=/hr/car-maintenance');

  return (
    <CarMaintenanceClient
      canManage={permissions.includes('hr.carMaintenance.manage')}
    />
  );
}
