import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { ApprovalInboxPage } from './ApprovalInboxPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Approvals — OTS' };

export default async function MyApprovalsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME ?? 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('workflow.my-approvals.view');
  if (!canView) redirect('/unauthorized?from=/workflow/my-approvals');

  return <ApprovalInboxPage />;
}
