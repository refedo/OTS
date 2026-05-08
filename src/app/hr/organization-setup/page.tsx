import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { OrgSetupClient } from './_page-client';
import prisma from '@/lib/db';

export const metadata: Metadata = { title: 'Organization Setup | HR | OTS' };
export const dynamic = 'force-dynamic';

export default async function OrgSetupPage() {
  const store = await cookies();
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canEdit = await checkPermission('hr.employee.edit');
  if (!canEdit) redirect('/unauthorized?from=/hr/organization-setup');

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, status: { not: 'TERMINATED' } },
    select: {
      id: true,
      fullNameEn: true,
      employmentId: true,
      occupation: true,
      reportsToId: true,
      departmentRef: { select: { name: true } },
    },
    orderBy: { fullNameEn: 'asc' },
  });

  return <OrgSetupClient employees={employees} />;
}
