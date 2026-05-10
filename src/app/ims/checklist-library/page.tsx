import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { ChecklistLibraryClient } from './_page-client';

export const metadata: Metadata = { title: 'Checklist Library | IMS | OTS' };
export const dynamic = 'force-dynamic';

export default async function ChecklistLibraryPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');
  return <ChecklistLibraryClient />;
}
