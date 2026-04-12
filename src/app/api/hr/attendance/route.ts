/**
 * GET /api/hr/attendance — list attendance records with filters.
 *
 * Query params:
 *   month=YYYY-MM          restrict to a calendar month
 *   workerType=EMPLOYEE|MANPOWER_SLOT
 *   employeeId=<uuid>
 *   manpowerSlotId=<uuid>
 *   status=<AttendanceStatus>
 *
 * Returns up to 5000 records in a single page — sufficient for monthly
 * views of the whole workforce.
 *
 * Phase 2 of OTS-MSS-HR-PAYROLL-v1. Gated by `hr.attendance.view`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import type { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.attendance.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const month = url.searchParams.get('month');
  const workerType = url.searchParams.get('workerType');
  const employeeId = url.searchParams.get('employeeId');
  const manpowerSlotId = url.searchParams.get('manpowerSlotId');
  const status = url.searchParams.get('status');

  const where: Prisma.AttendanceRecordWhereInput = {};

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));
    where.date = { gte: start, lt: end };
  }
  if (workerType === 'EMPLOYEE' || workerType === 'MANPOWER_SLOT') {
    where.workerType = workerType;
  }
  if (employeeId) where.employeeId = employeeId;
  if (manpowerSlotId) where.manpowerSlotId = manpowerSlotId;
  if (status) where.status = status as Prisma.AttendanceRecordWhereInput['status'];

  const records = await prisma.attendanceRecord.findMany({
    where,
    take: 5000,
    orderBy: [{ date: 'asc' }, { employeeId: 'asc' }, { manpowerSlotId: 'asc' }],
    include: {
      employee: { select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true, trade: true } },
      manpowerSlot: {
        select: {
          id: true,
          slotCode: true,
          trade: true,
          hourlyRate: true,
          agency: { select: { id: true, nameEn: true, nameAr: true } },
        },
      },
    },
  });

  return NextResponse.json({ count: records.length, records });
}
