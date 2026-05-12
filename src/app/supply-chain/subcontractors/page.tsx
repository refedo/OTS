import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import SubcontractorsPage from './_page-client';

export const metadata: Metadata = { title: 'Subcontractor Contracts' };
export const dynamic = 'force-dynamic';

export default async function SubcontractorContractsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canView    = permissions.includes('subcontractors.view');
  const canCreate  = permissions.includes('subcontractors.create');
  const canEdit    = permissions.includes('subcontractors.edit');
  const canDelete  = permissions.includes('subcontractors.delete');
  const canApprove = permissions.includes('subcontractors.approve');

  if (!canView) redirect('/unauthorized?from=/supply-chain/subcontractors');

  return (
    <SubcontractorsPage
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      canApprove={canApprove}
    />
  );
}
