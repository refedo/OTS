import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission } from '@/lib/permission-checker';
import { IdentityReconciliationClient } from '@/components/hr/identity-reconciliation-client';

export default async function IdentityReconciliationPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  if (!(await checkPermission('admin.identity.reconcile'))) {
    redirect('/unauthorized?from=/admin/identity-reconciliation');
  }

  const users = await prisma.user.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      name: true,
      email: true,
      position: true,
      dolibarrUserId: true,
      employeeId: true,
      reconciledAt: true,
      role: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  const gate = await prisma.systemConfig.findUnique({
    where: { key: 'identityReconciliationComplete' },
  });

  const serialized = users.map((u) => ({
    ...u,
    reconciledAt: u.reconciledAt ? u.reconciledAt.toISOString() : null,
  }));

  return (
    <IdentityReconciliationClient
      users={serialized}
      isComplete={gate?.value === 'true'}
    />
  );
}
