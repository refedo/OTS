import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { SupplierDetailClient } from './_page-client';

export const metadata: Metadata = { title: 'Supplier Card | Supply Chain | OTS' };
export const dynamic = 'force-dynamic';

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');
  const { id } = await params;
  return <SupplierDetailClient supplierId={parseInt(id, 10)} />;
}
