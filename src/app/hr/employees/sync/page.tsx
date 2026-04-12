import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission } from '@/lib/permission-checker';
import { EmployeeSyncClient } from '@/components/hr/employee-sync-client';

export default async function EmployeeSyncPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canSync = await checkPermission('hr.employee.sync');
  if (!canSync) redirect('/unauthorized?from=/hr/employees/sync');

  const gate = await prisma.systemConfig.findUnique({
    where: { key: 'identityReconciliationComplete' },
  });
  const reconciliationComplete = gate?.value === 'true';

  const logs = await prisma.dolibarrEmployeeSyncLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 20,
    include: {
      triggeredBy: { select: { id: true, name: true, email: true } },
    },
  });

  const serialized = logs.map((l) => ({
    id: l.id,
    startedAt: l.startedAt.toISOString(),
    finishedAt: l.finishedAt ? l.finishedAt.toISOString() : null,
    status: l.status,
    rowsRead: l.rowsRead,
    rowsCreated: l.rowsCreated,
    rowsUpdated: l.rowsUpdated,
    rowsSkipped: l.rowsSkipped,
    fieldsPreserved: l.fieldsPreserved,
    linksEstablished: l.linksEstablished,
    hardErrors: l.hardErrors,
    softWarnings: l.softWarnings,
    apiResponseMs: l.apiResponseMs,
    triggeredBy: l.triggeredBy,
  }));

  return (
    <EmployeeSyncClient logs={serialized} reconciliationComplete={reconciliationComplete} />
  );
}
