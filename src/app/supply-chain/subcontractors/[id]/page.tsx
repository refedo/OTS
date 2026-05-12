import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import SubcontractorContractDetailPage from './_page-client';

export const metadata: Metadata = { title: 'Subcontractor Contract' };
export const dynamic = 'force-dynamic';

export default async function SubcontractorDetailPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canView    = permissions.includes('subcontractors.view');
  const canEdit    = permissions.includes('subcontractors.edit');
  const canApprove = permissions.includes('subcontractors.approve');
  const canCertCreate  = permissions.includes('subcontractors.certs.create');
  const canCertApprove = permissions.includes('subcontractors.certs.approve');

  if (!canView) redirect('/unauthorized?from=/supply-chain/subcontractors');

  return (
    <SubcontractorContractDetailPage
      canEdit={canEdit}
      canApprove={canApprove}
      canCertCreate={canCertCreate}
      canCertApprove={canCertApprove}
    />
  );
}
