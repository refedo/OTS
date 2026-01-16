import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { BuildingsClient } from '@/components/buildings-client';

export default async function BuildingsPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch all buildings
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/buildings`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  const buildings = response.ok ? await response.json() : [];

  return <BuildingsClient initialBuildings={buildings} />;
}
