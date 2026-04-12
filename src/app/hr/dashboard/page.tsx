import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { getHrDashboardStats } from '@/lib/services/hr/hr-dashboard-stats';
import { HrDashboardClient } from '@/components/hr/hr-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function HrDashboardPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.employee.view');
  if (!canView) redirect('/unauthorized?from=/hr/dashboard');

  // Default window: current calendar month.
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  const [initialStats, departments, occupationRows, sectionRows] = await Promise.all([
    getHrDashboardStats({ startDate, endDate, groupBy: 'occupation' }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, occupation: { not: null } },
      select: { occupation: true },
      distinct: ['occupation'],
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, section: { not: null } },
      select: { section: true },
      distinct: ['section'],
    }),
  ]);

  const occupations = occupationRows
    .map((r) => r.occupation)
    .filter((v): v is string => !!v)
    .sort((a, b) => a.localeCompare(b));
  const sections = sectionRows
    .map((r) => r.section)
    .filter((v): v is string => !!v)
    .sort((a, b) => a.localeCompare(b));

  return (
    <HrDashboardClient
      initialStats={initialStats}
      departments={departments}
      occupations={occupations}
      sections={sections}
    />
  );
}
