import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { PublicHolidaysClient } from '@/components/hr/public-holidays-client';

export const dynamic = 'force-dynamic';

export default async function PublicHolidaysPage() {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.holiday.view');
  if (!canView) redirect('/unauthorized?from=/hr/public-holidays');

  const canManage = await checkPermission('hr.holiday.manage');

  const holidays = await prisma.publicHoliday.findMany({
    where: { deletedAt: null },
    orderBy: { date: 'asc' },
  });

  const serialized = holidays.map((h) => ({
    id: h.id,
    date: h.date.toISOString().slice(0, 10),
    nameEn: h.nameEn,
    nameAr: h.nameAr,
    isRecurring: h.isRecurring,
  }));

  return <PublicHolidaysClient holidays={serialized} canManage={canManage} />;
}
