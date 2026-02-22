import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { TasksDashboardClient } from '@/components/tasks-dashboard-client';

export default async function TasksDashboardPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const userPermissions = await getCurrentUserPermissions();

  // Fetch dashboard data
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/tasks/dashboard`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    redirect('/tasks');
  }

  const dashboardData = await response.json();

  return <TasksDashboardClient data={dashboardData} userPermissions={userPermissions} />;
}
