import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import InitiativesDashboardClient from '@/components/initiatives-dashboard-client';

export default async function InitiativesDashboardPage() {
  const cookieStore = await cookies();
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    redirect('/login');
  }

  const session = verifySession(token);
  if (!session) {
    redirect('/login');
  }

  // Fetch dashboard data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/initiatives/dashboard`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    redirect('/initiatives');
  }

  const dashboardData = await response.json();

  return (
    <InitiativesDashboardClient 
      data={dashboardData}
      session={session}
    />
  );
}
