import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { ImsGuideClient } from './_page-client';

export const metadata: Metadata = {
  title: 'IMS Quick Guide | OTS',
};

export const dynamic = 'force-dynamic';

export default async function ImsGuidePage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;

  if (!session) redirect('/login');

  return <ImsGuideClient />;
}
