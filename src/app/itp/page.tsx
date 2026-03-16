import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import { ITPClient } from '@/components/itp-client';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'ITP',
};


export default async function ITPPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  // Fetch ITPs
  const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/itp`, {
    headers: {
      Cookie: `${cookieName}=${token}`,
    },
    cache: 'no-store',
  });

  const itps = response.ok ? await response.json() : [];

  const userPermissions = await getCurrentUserPermissions();
  return <ITPClient initialITPs={itps} userPermissions={userPermissions} />;
}
