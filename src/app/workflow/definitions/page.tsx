import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { WorkflowDefinitionsClient } from './WorkflowDefinitionsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Workflow Definitions — OTS' };

export default async function WorkflowDefinitionsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME ?? 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('workflow.definitions.view');
  if (!canView) redirect('/unauthorized?from=/workflow/definitions');

  const canManage = await checkPermission('workflow.definitions.manage');

  return <WorkflowDefinitionsClient canManage={canManage} />;
}
