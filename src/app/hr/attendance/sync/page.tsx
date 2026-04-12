import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { AttendanceSyncClient } from '@/components/hr/attendance-sync-client';

export const dynamic = 'force-dynamic';

export default async function AttendanceSyncPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.attendance.view');
  if (!canView) redirect('/unauthorized?from=/hr/attendance/sync');

  const canSync = await checkPermission('hr.attendance.sync');
  const canProbe = await checkPermission('hr.attendance.probe');

  const logs = await prisma.googleSheetAttendanceSyncLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 20,
    include: { triggeredBy: { select: { id: true, name: true, email: true } } },
  });

  const serialized = logs.map((l) => ({
    id: l.id,
    startedAt: l.startedAt.toISOString(),
    finishedAt: l.finishedAt ? l.finishedAt.toISOString() : null,
    status: l.status,
    spreadsheetId: l.spreadsheetId,
    tabName: l.tabName,
    rowsRead: l.rowsRead,
    rowsCreated: l.rowsCreated,
    rowsUpdated: l.rowsUpdated,
    rowsUnchanged: l.rowsUnchanged,
    employeeOrphans: l.employeeOrphans,
    slotOrphans: l.slotOrphans,
    hardErrors: l.hardErrors,
    softWarnings: l.softWarnings,
    durationMs: l.durationMs,
    triggeredBy: l.triggeredBy,
  }));

  return <AttendanceSyncClient logs={serialized} canSync={canSync} canProbe={canProbe} />;
}
