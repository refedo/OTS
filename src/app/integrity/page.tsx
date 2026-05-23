import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import IntegrityPageClient from './_page-client';

export const metadata = {
  title: 'Report a Violation | Hexa Steel OTS',
};

export default async function IntegrityPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canViewAll = permissions.includes('integrity.view_all');
  const canResolve = permissions.includes('integrity.resolve');

  return (
    <IntegrityPageClient
      canViewAll={canViewAll}
      canResolve={canResolve}
    />
  );
}
