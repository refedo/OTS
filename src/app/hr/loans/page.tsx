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
  // Regular employees can see their own page too (via linked employee)
  // but we still require at least loan-view or being an employee — allow access if any HR perm
  if (!canView && !perms.includes('hr.employee.view')) {
    redirect('/unauthorized?from=/hr/loans');
  }

  const canViewAll = canView;

  return <LoansPageClient canViewAll={canViewAll} />;
}
