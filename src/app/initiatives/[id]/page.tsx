import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { InitiativeDetail } from '@/components/initiative-detail';

export default async function InitiativeDetailPage({ params }: { params: { id: string } }) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch initiative details
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/initiatives/${params.id}`, {
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
    <InitiativeDetail 
      initiative={initiative}
      userRole={session.role}
      userId={session.sub}
    />
  );
}
