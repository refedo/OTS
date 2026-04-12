import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { checkPermission, getCurrentUserPermissions } from '@/lib/permission-checker';
import { ManpowerSlotsClient } from '@/components/hr/manpower-slots-client';

export default async function ManpowerSlotsPage() {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');
  if (!(await checkPermission('hr.manpowerSlot.view')))
    redirect('/unauthorized?from=/hr/manpower-slots');

  const permissions = await getCurrentUserPermissions();
  const canManage = permissions.includes('hr.manpowerSlot.manage');

  const agencies = await prisma.agency.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    orderBy: { nameEn: 'asc' },
    select: { id: true, nameEn: true, nameAr: true },
  });

  const slots = await prisma.manpowerSlot.findMany({
    where: { deletedAt: null },
    orderBy: [{ agencyId: 'asc' }, { slotCode: 'asc' }],
    include: {
      agency: { select: { id: true, nameEn: true, nameAr: true } },
    },
  });

  const serialized = slots.map((s) => ({
    id: s.id,
    slotCode: s.slotCode,
    trade: s.trade,
    hourlyRate: s.hourlyRate.toString(),
    cardStatus: s.cardStatus,
    notes: s.notes,
    agency: s.agency,
  }));

  return (
    <ManpowerSlotsClient slots={serialized} agencies={agencies} canManage={canManage} />
  );
}
