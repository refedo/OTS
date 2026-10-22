import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import Link from 'next/link';
import { SupplierListClient } from './_page-client';

export const metadata: Metadata = { title: 'Supplier Portal | Supply Chain | OTS' };
export const dynamic = 'force-dynamic';

export default async function SupplierPortalPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');
  return <><div className="mx-auto max-w-7xl px-4 pt-5"><Link href="/supply-chain/supplier-applications" className="inline-block border border-[#2C3E50] px-4 py-3 text-sm font-semibold text-[#2C3E50]">Review new supplier applications</Link></div><SupplierListClient /></>;
}
