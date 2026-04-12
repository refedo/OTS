import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { LeavesClient } from '@/components/hr/leaves-client';

export const metadata: Metadata = { title: 'My Leaves' };

export default async function LeavesPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  if (!perms.includes('hr.leaves.view') && !perms.includes('hr.leaves.viewAll') && !perms.includes('hr.leaves.request')) {
    redirect('/unauthorized?from=/hr/leaves');
  }

  return (
    <LeavesClient
      canApprove={perms.includes('hr.leaves.approve')}
      canViewAll={perms.includes('hr.leaves.viewAll')}
      canRequest={perms.includes('hr.leaves.request')}
    />
  );
}
