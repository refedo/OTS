import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { AssetsClient } from '@/components/hr/assets-client';

export default async function AssetsPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canView = permissions.includes('hr.assets.view') || permissions.includes('hr.assets.manage');
  if (!canView) redirect('/unauthorized?from=/hr/assets');

  return (
    <AssetsClient
      canManage={permissions.includes('hr.assets.manage')}
      canViewViolations={permissions.includes('hr.violations.view') || permissions.includes('hr.violations.manage')}
      canManageViolations={permissions.includes('hr.violations.manage')}
    />
  );
}
