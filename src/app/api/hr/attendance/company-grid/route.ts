/**
 * GET /api/hr/attendance/company-grid?year=YYYY&month=MM
 *
 * Company-level attendance grid for non-production / office staff.
 * All active employees (no manpower). Day status derived from:
 *   1. Weekend (Fri/Sat)           → WEEKEND
 *   2. Public holiday in DB        → PUBLIC_HOLIDAY
 *   3. Approved leave request      → mapped leave status
 *   4. Otherwise                   → PRESENT (assumed working)
 *
 * No overtime data — office team has no tracked OT.
 * 19.3.0
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';

type DaySummary = {
  present: number;
  absentWithPermission: number;
  absentNoPermission: number;
  vacation: number;
  sick: number;
  weekend: number;
  holiday: number;
  unknown: number;
};

function emptySummary(): DaySummary {
  return { present: 0, absentWithPermission: 0, absentNoPermission: 0, vacation: 0, sick: 0, weekend: 0, holiday: 0, unknown: 0 };
}

function mapLeaveCode(code: string): string {
  const c = code.toUpperCase();
  if (c.includes('SICK')) return 'SICK_LEAVE';
  if (c.includes('PERMIT') && !c.includes('WITHOUT') && !c.includes('UNPERMIT')) return 'ABSENT_WITH_PERMISSION';
  if (c.includes('WITHOUT') || c.includes('UNPERMIT')) return 'ABSENT_NO_PERMISSION';
  // ANNUAL, URGENT, FAMILY, etc. → ANNUAL_VACATION
  return 'ANNUAL_VACATION';
}

export const GET = withApiContext(async (req: NextRequest) => {
  const now = new Date();
  const year  = parseInt(req.nextUrl.searchParams.get('year')  ?? String(now.getFullYear()), 10);
  const month = parseInt(req.nextUrl.searchParams.get('month') ?? String(now.getMonth() + 1), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59));

  const [employees, leaveRequests, publicHolidays] = await Promise.all([
    prisma.employee.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true, occupation: true, section: true },
      orderBy: [{ section: 'asc' }, { fullNameEn: 'asc' }],
    }),
    prisma.leaveRequest.findMany({
      where: {
        deletedAt: null,
        status: 'APPROVED',
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: {
        employeeId: true,
        startDate: true,
        endDate: true,
        leaveType: { select: { code: true, nameEn: true } },
      },
    }),
    prisma.publicHoliday.findMany({
      where: {
        deletedAt: null,
        date: { lte: end },
        OR: [{ endDate: null }, { endDate: { gte: start } }],
      },
      select: { date: true, endDate: true },
    }),
  ]);

  // Build set of holiday day numbers in this month
  const holidayDays = new Set<number>();
  for (const h of publicHolidays) {
    const hStart = new Date(h.date);
    const hEnd   = h.endDate ? new Date(h.endDate) : hStart;
    for (let d = 1; d <= daysInMonth; d++) {
      const ts = new Date(Date.UTC(year, month - 1, d));
      if (ts >= hStart && ts <= hEnd) holidayDays.add(d);
    }
  }

  // Build leave lookup: employeeId → Map<dayNum, status>
  const leaveByEmp = new Map<string, Map<number, string>>();
  for (const lr of leaveRequests) {
    if (!leaveByEmp.has(lr.employeeId)) leaveByEmp.set(lr.employeeId, new Map());
    const dayMap = leaveByEmp.get(lr.employeeId)!;

    const lrStart = new Date(lr.startDate);
    const lrEnd   = new Date(lr.endDate);

    // Clamp to current month
    const clampedStartD =
      lrStart.getUTCFullYear() < year || (lrStart.getUTCFullYear() === year && lrStart.getUTCMonth() + 1 < month)
        ? 1 : lrStart.getUTCDate();
    const clampedEndD =
      lrEnd.getUTCFullYear() > year || (lrEnd.getUTCFullYear() === year && lrEnd.getUTCMonth() + 1 > month)
        ? daysInMonth : lrEnd.getUTCDate();

    const status = mapLeaveCode(lr.leaveType.code ?? lr.leaveType.nameEn ?? '');
    for (let d = clampedStartD; d <= clampedEndD; d++) dayMap.set(d, status);
  }

  // Build employee rows
  type EmpRow = {
    id: string; employmentId: string; fullNameEn: string; fullNameAr: string | null;
    occupation: string | null; section: string | null;
    days: Record<number, { status: string }>;
    summary: DaySummary;
  };

  const rows: EmpRow[] = employees.map(emp => {
    const leaveDays = leaveByEmp.get(emp.id) ?? new Map<number, string>();
    const days: Record<number, { status: string }> = {};
    const summary = emptySummary();

    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month - 1, d).getDay(); // 0=Sun…5=Fri,6=Sat
      let status: string;

      if (dow === 5 || dow === 6) {
        status = 'WEEKEND'; summary.weekend++;
      } else if (holidayDays.has(d)) {
        status = 'PUBLIC_HOLIDAY'; summary.holiday++;
      } else if (leaveDays.has(d)) {
        status = leaveDays.get(d)!;
        if      (status === 'ANNUAL_VACATION')        summary.vacation++;
        else if (status === 'SICK_LEAVE')             summary.sick++;
        else if (status === 'ABSENT_WITH_PERMISSION') summary.absentWithPermission++;
        else if (status === 'ABSENT_NO_PERMISSION')   summary.absentNoPermission++;
        else summary.vacation++;
      } else {
        status = 'PRESENT'; summary.present++;
      }
      days[d] = { status };
    }

    return { id: emp.id, employmentId: emp.employmentId, fullNameEn: emp.fullNameEn, fullNameAr: emp.fullNameAr, occupation: emp.occupation, section: emp.section, days, summary };
  });

  const aggregate = rows.reduce<DaySummary>((acc, r) => ({
    present:              acc.present              + r.summary.present,
    absentWithPermission: acc.absentWithPermission + r.summary.absentWithPermission,
    absentNoPermission:   acc.absentNoPermission   + r.summary.absentNoPermission,
    vacation:             acc.vacation             + r.summary.vacation,
    sick:                 acc.sick                 + r.summary.sick,
    weekend:              acc.weekend              + r.summary.weekend,
    holiday:              acc.holiday              + r.summary.holiday,
    unknown:              acc.unknown              + r.summary.unknown,
  }), emptySummary());

  return NextResponse.json({ year, month, daysInMonth, aggregate, employees: rows });
});
