import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import { LettersClient } from '@/components/hr/letters-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Letters & Correspondence' };

export default async function LettersPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const permissions = await getCurrentUserPermissions();
  const canView = permissions.includes('hr.letters.view') || permissions.includes('hr.letters.manage');
  if (!canView) redirect('/unauthorized?from=/hr/letters');

  const canManage = permissions.includes('hr.letters.manage');

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    select: { id: true, fullNameEn: true, employmentId: true },
    orderBy: { fullNameEn: 'asc' },
  });

  return (
    <LettersClient
      employees={employees.map((e) => ({
        id: e.id,
        fullNameEn: e.fullNameEn,
        employmentId: e.employmentId,
      }))}
      canManage={canManage}
    />
  );
}
