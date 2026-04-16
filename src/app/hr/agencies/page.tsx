import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { AgenciesClient } from '@/components/hr/agencies-client';

export const dynamic = 'force-dynamic';

export default async function AgenciesPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.agency.view');
  if (!canView) redirect('/unauthorized?from=/hr/agencies');

  const permissions = await getCurrentUserPermissions();
  const canManage = permissions.includes('hr.agency.manage');

  const agencies = await prisma.agency.findMany({
    where: { deletedAt: null },
    orderBy: { nameEn: 'asc' },
    include: {
      _count: { select: { slots: { where: { deletedAt: null } } } },
    },
  });

  const serialized = agencies.map((a) => ({
    id: a.id,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    contactPerson: a.contactPerson,
    contactPhone: a.contactPhone,
    contractRef: a.contractRef,
    contractStart: a.contractStart ? a.contractStart.toISOString() : null,
    contractEnd: a.contractEnd ? a.contractEnd.toISOString() : null,
    status: a.status,
    slotCount: a._count.slots,
  }));

  return <AgenciesClient agencies={serialized} canManage={canManage} />;
}
