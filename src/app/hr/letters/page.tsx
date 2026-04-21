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
  const canApproveCeo = permissions.includes('hr.letters.approveCeo') || permissions.includes('ALL');
  const canView = permissions.includes('hr.letters.view') || permissions.includes('hr.letters.manage') || canApproveCeo;
  if (!canView) redirect('/unauthorized?from=/hr/letters');

  const canManage = permissions.includes('hr.letters.manage');

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, fullNameEn: true, employmentId: true },
      orderBy: { fullNameEn: 'asc' },
    }),
    prisma.department.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <LettersClient
      employees={employees.map((e) => ({ id: e.id, fullNameEn: e.fullNameEn, employmentId: e.employmentId }))}
      departments={departments}
      canManage={canManage}
      canApproveCeo={canApproveCeo}
    />
  );
}

