import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { TimesheetClient } from '@/components/hr/timesheet-client';

export const dynamic = 'force-dynamic';

type Params = Promise<{ workerType: string; id: string }>;
type SearchParams = Promise<{ month?: string }>;

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default async function TimesheetPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const cookieName = process.env.COOKIE_NAME || 'ots_session';
  const store = await cookies();
  const token = store.get(cookieName)?.value;
  const session = token ? verifySession(token) : null;
  if (!session) redirect('/login');

  const canView = await checkPermission('hr.attendance.view');
  if (!canView) redirect('/unauthorized?from=/hr/attendance');

  const { workerType, id } = await params;
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentMonth();

  if (workerType !== 'EMPLOYEE' && workerType !== 'MANPOWER_SLOT') notFound();

  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  let workerLabel = '';
  let workerSubLabel = '';
  let workerArLabel: string | null = null;

  if (workerType === 'EMPLOYEE') {
    const emp = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true, trade: true },
    });
    if (!emp) notFound();
    workerLabel = emp.fullNameEn;
    workerArLabel = emp.fullNameAr;
    workerSubLabel = `${emp.employmentId}${emp.trade ? ` · ${emp.trade}` : ''}`;
  } else {
    const slot = await prisma.manpowerSlot.findUnique({
      where: { id },
      include: { agency: { select: { nameEn: true, nameAr: true } } },
    });
    if (!slot) notFound();
    workerLabel = slot.slotCode;
    workerSubLabel = `${slot.agency?.nameEn ?? 'No agency'}${slot.trade ? ` · ${slot.trade}` : ''}`;
  }

  const [records, holidays, employeePickerList] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        workerType,
        ...(workerType === 'EMPLOYEE' ? { employeeId: id } : { manpowerSlotId: id }),
        date: { gte: start, lt: end },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.publicHoliday.findMany({
      where: { deletedAt: null, date: { gte: start, lt: end } },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        employmentId: true,
        fullNameEn: true,
        fullNameAr: true,
        trade: true,
        occupation: true,
      },
      orderBy: { fullNameEn: 'asc' },
    }),
  ]);

  const serialized = records.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    status: r.status,
    regularHours: r.regularHours.toString(),
    overtimeHours: r.overtimeHours.toString(),
    otMultiplier: r.otMultiplier.toString(),
    isFriday: r.isFriday,
    isPublicHoliday: r.isPublicHoliday,
    rawCellA: r.rawCellA,
    rawCellP: r.rawCellP,
  }));

  const holidaysSerialized = holidays.map((h) => ({
    date: h.date.toISOString().slice(0, 10),
    nameEn: h.nameEn,
    nameAr: h.nameAr,
  }));

  return (
    <TimesheetClient
      workerType={workerType}
      workerId={id}
      workerLabel={workerLabel}
      workerArLabel={workerArLabel}
      workerSubLabel={workerSubLabel}
      month={month}
      records={serialized}
      holidays={holidaysSerialized}
      employees={employeePickerList}
    />
  );
}
