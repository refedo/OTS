import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { CustodiesPageClient } from '@/components/hr/custodies-page-client';

export const dynamic = 'force-dynamic';

export default async function CustodiesPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  const canView = perms.includes('hr.custodies.view') || perms.includes('hr.custodies.manage');
  const canViewOwn = perms.includes('hr.custodies.viewOwn');
  if (!canView && !canViewOwn) {
    redirect('/unauthorized?from=/hr/custodies');
  }

  return <CustodiesPageClient canViewAll={canView} canManage={perms.includes('hr.custodies.manage')} />;
}
