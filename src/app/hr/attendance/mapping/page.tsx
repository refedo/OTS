import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { AttendanceMappingClient } from '@/components/hr/attendance-mapping-client';

export const dynamic = 'force-dynamic';

export default async function AttendanceMappingPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canSync = await checkPermission('hr.attendance.sync');
  if (!canSync) redirect('/unauthorized?from=/hr/attendance/mapping');

  const [candidates, employees] = await Promise.all([
    prisma.attendanceMappingCandidate.findMany({
      orderBy: [{ status: 'asc' }, { lastSeenAt: 'desc' }],
      include: {
        resolvedEmployee: {
          select: {
            id: true,
            employmentId: true,
            fullNameEn: true,
            fullNameAr: true,
          },
        },
        resolvedBy: { select: { id: true, name: true } },
        ignoredBy: { select: { id: true, name: true } },
      },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        employmentId: true,
        fullNameEn: true,
        fullNameAr: true,
        occupation: true,
      },
      orderBy: { fullNameEn: 'asc' },
    }),
  ]);

  const serialized = candidates.map((c) => ({
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

  return <AttendanceMappingClient candidates={serialized} employees={employees} />;
}
