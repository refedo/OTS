import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { LoansPageClient } from '@/components/hr/loans-page-client';

export const dynamic = 'force-dynamic';

export default async function LoansPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  const canView = perms.includes('hr.loans.view') || perms.includes('hr.loans.manage');
  const canViewOwn = perms.includes('hr.loans.viewOwn');
  if (!canView && !canViewOwn) {
    redirect('/unauthorized?from=/hr/loans');
  }

  return <LoansPageClient canViewAll={canView} canManage={perms.includes('hr.loans.manage')} />;
}
