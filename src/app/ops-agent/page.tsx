import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { OpsAgentLayout } from './_components/OpsAgentLayout';

export const metadata: Metadata = { title: 'Ops Agent' };

export default async function OpsAgentPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  if (!perms.some((p) => ['ops_agent.view', 'ops_agent.run', 'ops_agent.configure'].includes(p))) {
    redirect('/unauthorized?from=/ops-agent');
  }

  return (
    <OpsAgentLayout
      canRun={perms.includes('ops_agent.run')}
      canConfigure={perms.includes('ops_agent.configure')}
      canResolveFlags={perms.includes('ops_agent.resolve_flags')}
    />
  );
}
