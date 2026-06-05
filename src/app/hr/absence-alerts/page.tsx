import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { AbsenceAlertsClient } from '@/components/hr/absence-alerts-client';

export const metadata: Metadata = { title: 'Absence Alerts' };

export default async function AbsenceAlertsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  if (!perms.includes('hr.analytics.view')) {
    redirect('/unauthorized?from=/hr/absence-alerts');
  }

  return <AbsenceAlertsClient />;
}
