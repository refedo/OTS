import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import type { Metadata } from 'next';
import { ConcentrationRiskDashboard } from '@/components/concentration-risk/ConcentrationRiskDashboard';

export const metadata: Metadata = {
  title: 'Concentration Risk Dashboard',
};

export default async function ConcentrationRiskPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const hasAccess = await checkPermission('concentrationRisk.view');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return <ConcentrationRiskDashboard />;
}
