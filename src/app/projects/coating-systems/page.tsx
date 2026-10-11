import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { verifySession } from '@/lib/jwt';
import { CoatingSystemsReportClient } from './_page-client';

export const metadata: Metadata = { title: 'Coating Systems | Projects | OTS' };
export const dynamic = 'force-dynamic';

export default async function CoatingSystemsReportPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');
  return (
    <Suspense>
      <CoatingSystemsReportClient />
    </Suspense>
  );
}
