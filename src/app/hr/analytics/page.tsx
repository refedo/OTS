import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/jwt';
import { getCurrentUserPermissions } from '@/lib/permission-checker';
import prisma from '@/lib/db';
import { AbsenceAnalyticsClient } from '@/components/hr/absence-analytics-client';

export const metadata: Metadata = { title: 'Absence Analytics' };

export default async function AbsenceAnalyticsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  if (!perms.includes('hr.analytics.view')) {
    redirect('/unauthorized?from=/hr/analytics');
  }

  // Fetch filter options for dropdowns
  const [sections, occupations] = await Promise.all([
    prisma.employee.findMany({
      where: { deletedAt: null, section: { not: null } },
      select: { section: true },
      distinct: ['section'],
      orderBy: { section: 'asc' },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, occupation: { not: null } },
      select: { occupation: true },
      distinct: ['occupation'],
      orderBy: { occupation: 'asc' },
    }),
  ]);

  const sectionOptions = sections.map((e: { section: string | null }) => e.section).filter((s): s is string => s !== null);
  const occupationOptions = occupations.map((e: { occupation: string | null }) => e.occupation).filter((o): o is string => o !== null);

  return (
    <AbsenceAnalyticsClient
      sectionOptions={sectionOptions}
      occupationOptions={occupationOptions}
    />
  );
}
