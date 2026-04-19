import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { OnboardingClient } from './_page-client';

export const metadata: Metadata = { title: 'HR — Employee Onboarding' };

export default async function OnboardingPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.view');
  if (!canView) redirect('/unauthorized?from=/hr/onboarding');

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const newEmployees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      dateOfJoining: { gte: threeMonthsAgo },
    },
    orderBy: { dateOfJoining: 'desc' },
    select: {
      id: true,
      employmentId: true,
      fullNameEn: true,
      fullNameAr: true,
      occupation: true,
      department: true,
      section: true,
      dateOfJoining: true,
      nationalId: true,
    },
  });

  const serialized = newEmployees.map(e => ({
    ...e,
    dateOfJoining: e.dateOfJoining.toISOString().slice(0, 10),
  }));

  return <OnboardingClient employees={serialized} />;
}
