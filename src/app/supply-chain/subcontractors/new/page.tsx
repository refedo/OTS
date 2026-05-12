import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import NewSubcontractorContractPage from './_page-client';

export const metadata: Metadata = { title: 'New Subcontractor Contract' };
export const dynamic = 'force-dynamic';

export default async function NewContractPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canCreate = await checkPermission('subcontractors.create');
  if (!canCreate) redirect('/unauthorized?from=/supply-chain/subcontractors/new');

  return <NewSubcontractorContractPage />;
}
