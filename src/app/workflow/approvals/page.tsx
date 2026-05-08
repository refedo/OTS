import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { ApprovalsTrackingClient } from './ApprovalsTrackingClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Approval Tracking — OTS' };

export default async function ApprovalsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME ?? 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/login');

  const canViewAll = await checkPermission('workflow.instances.view');
  const canViewOwn = await checkPermission('workflow.my-approvals.view');

  if (!canViewAll && !canViewOwn) redirect('/unauthorized?from=/workflow/approvals');

  return <ApprovalsTrackingClient isAdmin={canViewAll} currentUserId={session!.sub} />;
}
