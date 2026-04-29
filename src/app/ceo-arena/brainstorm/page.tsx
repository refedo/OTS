import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import type { Metadata } from 'next';
import { CeoArenaBoard } from '@/components/ceo-arena/CeoArenaBoard';

export const metadata: Metadata = {
  title: 'CEO Arena — Brainstorm Board',
};

export default async function CeoArenaPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    redirect('/login');
  }

  const hasAccess = await checkPermission('executive.view');
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return <CeoArenaBoard />;
}
