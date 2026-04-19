import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { TrainingClient } from './_page-client';

export const metadata: Metadata = { title: 'HR — Employee Training' };

export default async function TrainingPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.view');
  if (!canView) redirect('/unauthorized?from=/hr/training');

  const employeeCount = await prisma.employee.count({
    where: { deletedAt: null, status: 'ACTIVE' },
  });

  const occupations = await prisma.employee.findMany({
    where: { deletedAt: null, status: 'ACTIVE', occupation: { not: null } },
    select: { occupation: true },
    distinct: ['occupation'],
    orderBy: { occupation: 'asc' },
  });

  return (
    <TrainingClient
      activeEmployeeCount={employeeCount}
      occupations={occupations.map(o => o.occupation as string)}
    />
  );
}
