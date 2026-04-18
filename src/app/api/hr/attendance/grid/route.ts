/**
 * GET /api/hr/attendance/grid?year=YYYY&month=MM
 *
 * Returns a monthly attendance grid: employees as rows, days as columns.
 * Only employees with at least one attendance record in the period are included.
 *
 * 19.3.0
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';

export const GET = withApiContext(async (req: NextRequest, session) => {
  const now = new Date();
  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(now.getFullYear()), 10);
  const month = parseInt(req.nextUrl.searchParams.get('month') ?? String(now.getMonth() + 1), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59));

  // Fetch all EMPLOYEE attendance records for the period in one query
  const records = await prisma.attendanceRecord.findMany({
    where: {
      workerType: 'EMPLOYEE',
      employeeId: { not: null },
      date: { gte: start, lte: end },
    },
    select: {
      employeeId: true,
      date: true,
      status: true,
      regularHours: true,
      overtimeHours: true,
      employee: {
        select: {
          id: true,
          employmentId: true,
          fullNameEn: true,
          fullNameAr: true,
          occupation: true,
          section: true,
        },
      },
    },
    orderBy: [{ employee: { fullNameEn: 'asc' } }, { date: 'asc' }],
  });

  // Group by employee
  const empMap = new Map<string, {
    id: string;
    employmentId: string;
    fullNameEn: string;
    fullNameAr: string | null;
    occupation: string | null;
    section: string | null;
    days: Record<number, { status: string; regularHours: number; overtimeHours: number }>;
  }>();

  for (const r of records) {
    if (!r.employeeId || !r.employee) continue;
    const empId = r.employeeId;
    if (!empMap.has(empId)) {
      empMap.set(empId, {
        id: r.employee.id,
        employmentId: r.employee.employmentId,
        fullNameEn: r.employee.fullNameEn,
        fullNameAr: r.employee.fullNameAr,
        occupation: r.employee.occupation,
        section: r.employee.section,
        days: {},
      });
    }
    const day = new Date(r.date).getUTCDate();
    empMap.get(empId)!.days[day] = {
      status: r.status,
      regularHours: Number(r.regularHours),
      overtimeHours: Number(r.overtimeHours),
    };
  }

  const employees = Array.from(empMap.values()).map(emp => {
    // Compute summary
    const summary = { present: 0, absent: 0, vacation: 0, sick: 0, weekend: 0, holiday: 0, unknown: 0 };
    for (const d of Object.values(emp.days)) {
      switch (d.status) {
        case 'PRESENT': summary.present++; break;
        case 'ABSENT_WITH_PERMISSION':
        case 'ABSENT_NO_PERMISSION': summary.absent++; break;
        case 'ANNUAL_VACATION': summary.vacation++; break;
        case 'SICK_LEAVE': summary.sick++; break;
        case 'WEEKEND': summary.weekend++; break;
        case 'PUBLIC_HOLIDAY': summary.holiday++; break;
        default: summary.unknown++; break;
      }
    }
    return { ...emp, summary };
  });

  return NextResponse.json({ year, month, daysInMonth, employees });
});
