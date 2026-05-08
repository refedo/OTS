import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { AttendanceTabsClient } from '@/components/hr/attendance-tabs-client';

export const dynamic = 'force-dynamic';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string; status?: string; workerType?: string }>;
}) {
  const sp = await searchParams;
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const perms = await getCurrentUserPermissions();
  const canView = perms.includes('hr.attendance.view');
  if (!canView) redirect('/unauthorized?from=/hr/attendance');

  const canSync = perms.includes('hr.attendance.sync');

  // Fetch mapping data only for users who can sync
  const [candidates, employees, firstEmployee] = await Promise.all([
    canSync
      ? prisma.attendanceMappingCandidate.findMany({
          orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
          include: {
            resolvedEmployee: { select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true } },
            resolvedBy: { select: { id: true, name: true } },
            ignoredBy: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
    canSync
      ? prisma.employee.findMany({
          where: { deletedAt: null, status: 'ACTIVE' },
          select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true, occupation: true },
          orderBy: { fullNameEn: 'asc' },
        })
      : Promise.resolve([]),
    prisma.employee.findFirst({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
      orderBy: { fullNameEn: 'asc' },
    }),
  ]);

  const timesheetHref = firstEmployee
    ? `/hr/attendance/timesheet/EMPLOYEE/${firstEmployee.id}`
    : '/hr/employees';

  const serializedCandidates = candidates.map((c) => ({
    id: c.id,
    identifier: c.identifier,
    workerType: c.workerType as 'EMPLOYEE' | 'MANPOWER_SLOT',
    displayName: c.displayName,
    status: c.status as 'UNMAPPED' | 'RESOLVED' | 'IGNORED',
    resolvedEmployee: c.resolvedEmployee,
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
    resolvedBy: c.resolvedBy,
    ignoredAt: c.ignoredAt ? c.ignoredAt.toISOString() : null,
    ignoredBy: c.ignoredBy,
    ignoreReason: c.ignoreReason,
    firstSeenAt: c.firstSeenAt.toISOString(),
    lastSeenAt: c.lastSeenAt.toISOString(),
  }));

  return (
    <AttendanceTabsClient
      canSync={canSync}
      mappingCandidates={serializedCandidates}
      employees={employees}
      timesheetHref={timesheetHref}
      initialTab={sp.tab ?? 'grid'}
      initialMonth={sp.month}
      initialStatus={sp.status ?? 'all'}
      initialWorkerType={sp.workerType ?? 'all'}
    />
  );
}
