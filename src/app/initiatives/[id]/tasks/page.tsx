import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import InitiativeTasksClient from '@/components/initiative-tasks-client';

export default async function TasksPage({ params }: { params: { id: string } }) {
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

  // Fetch initiative data
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/initiatives/${params.id}`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    redirect('/initiatives');
  }

  const initiative = await response.json();

  return (
    <InitiativeTasksClient 
      initiative={initiative} 
      session={session}
    />
  );
}
