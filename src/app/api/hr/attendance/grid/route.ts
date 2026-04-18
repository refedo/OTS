/**
 * GET /api/hr/attendance/grid?year=YYYY&month=MM
 *
 * Returns a monthly attendance grid for both employees and manpower slots:
 * employees/manpower as rows, days as columns, with full per-status summary
 * columns and aggregate KPI totals for the whole period.
 *
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
  totalRegularHours: number;
  totalOvertimeHours: number;
};

function emptySummary(): DaySummary {
  return { present: 0, absentWithPermission: 0, absentNoPermission: 0, vacation: 0, sick: 0, weekend: 0, holiday: 0, unknown: 0, totalRegularHours: 0, totalOvertimeHours: 0 };
}

function addToSummary(summary: DaySummary, status: string, regularHours: number, overtimeHours: number) {
  switch (status) {
    case 'PRESENT': summary.present++; break;
    case 'ABSENT_WITH_PERMISSION': summary.absentWithPermission++; break;
    case 'ABSENT_NO_PERMISSION': summary.absentNoPermission++; break;
    case 'ANNUAL_VACATION': summary.vacation++; break;
    case 'SICK_LEAVE': summary.sick++; break;
    case 'WEEKEND': summary.weekend++; break;
    case 'PUBLIC_HOLIDAY': summary.holiday++; break;
    default: summary.unknown++; break;
  }
  summary.totalRegularHours += regularHours;
  summary.totalOvertimeHours += overtimeHours;
}

function addSummaries(a: DaySummary, b: DaySummary): DaySummary {
  return {
    present: a.present + b.present,
    absentWithPermission: a.absentWithPermission + b.absentWithPermission,
    absentNoPermission: a.absentNoPermission + b.absentNoPermission,
    vacation: a.vacation + b.vacation,
    sick: a.sick + b.sick,
    weekend: a.weekend + b.weekend,
    holiday: a.holiday + b.holiday,
    unknown: a.unknown + b.unknown,
    totalRegularHours: a.totalRegularHours + b.totalRegularHours,
    totalOvertimeHours: a.totalOvertimeHours + b.totalOvertimeHours,
  };
}

export const GET = withApiContext(async (req: NextRequest) => {
  const now = new Date();
  const year = parseInt(req.nextUrl.searchParams.get('year') ?? String(now.getFullYear()), 10);
  const month = parseInt(req.nextUrl.searchParams.get('month') ?? String(now.getMonth() + 1), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59));

  // Fetch employee and manpower records in parallel
  const [empRecords, mpRecords] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { workerType: 'EMPLOYEE', employeeId: { not: null }, date: { gte: start, lte: end } },
      select: {
        employeeId: true, date: true, status: true, regularHours: true, overtimeHours: true,
        employee: { select: { id: true, employmentId: true, fullNameEn: true, fullNameAr: true, occupation: true, section: true } },
      },
      orderBy: [{ employee: { fullNameEn: 'asc' } }, { date: 'asc' }],
    }),
    prisma.attendanceRecord.findMany({
      where: { workerType: 'MANPOWER_SLOT', manpowerSlotId: { not: null }, date: { gte: start, lte: end } },
      select: {
        manpowerSlotId: true, date: true, status: true, regularHours: true, overtimeHours: true,
        manpowerSlot: { select: { id: true, slotCode: true, trade: true, agency: { select: { nameEn: true } } } },
      },
      orderBy: [{ manpowerSlot: { slotCode: 'asc' } }, { date: 'asc' }],
    }),
  ]);

  // ── Build employee map ──────────────────────────────────────────────────────
  type EmpEntry = { id: string; employmentId: string; fullNameEn: string; fullNameAr: string | null; occupation: string | null; section: string | null; days: Record<number, { status: string; regularHours: number; overtimeHours: number }>; summary: DaySummary };
  const empMap = new Map<string, EmpEntry>();

  for (const r of empRecords) {
    if (!r.employeeId || !r.employee) continue;
    if (!empMap.has(r.employeeId)) {
      empMap.set(r.employeeId, { id: r.employee.id, employmentId: r.employee.employmentId, fullNameEn: r.employee.fullNameEn, fullNameAr: r.employee.fullNameAr, occupation: r.employee.occupation, section: r.employee.section, days: {}, summary: emptySummary() });
    }
    const entry = empMap.get(r.employeeId)!;
    const day = new Date(r.date).getUTCDate();
    const rh = Number(r.regularHours);
    const oh = Number(r.overtimeHours);
    entry.days[day] = { status: r.status, regularHours: rh, overtimeHours: oh };
    addToSummary(entry.summary, r.status, rh, oh);
  }

  // ── Build manpower map ─────────────────────────────────────────────────────
  type MpEntry = { id: string; slotCode: string; trade: string; agencyName: string; days: Record<number, { status: string; regularHours: number; overtimeHours: number }>; summary: DaySummary };
  const mpMap = new Map<string, MpEntry>();

  for (const r of mpRecords) {
    if (!r.manpowerSlotId || !r.manpowerSlot) continue;
    if (!mpMap.has(r.manpowerSlotId)) {
      mpMap.set(r.manpowerSlotId, { id: r.manpowerSlot.id, slotCode: r.manpowerSlot.slotCode, trade: r.manpowerSlot.trade, agencyName: r.manpowerSlot.agency?.nameEn ?? 'Unknown', days: {}, summary: emptySummary() });
    }
    const entry = mpMap.get(r.manpowerSlotId)!;
    const day = new Date(r.date).getUTCDate();
    const rh = Number(r.regularHours);
    const oh = Number(r.overtimeHours);
    entry.days[day] = { status: r.status, regularHours: rh, overtimeHours: oh };
    addToSummary(entry.summary, r.status, rh, oh);
  }

  // ── Compute aggregates ─────────────────────────────────────────────────────
  const empAggregate = Array.from(empMap.values()).reduce((acc, e) => addSummaries(acc, e.summary), emptySummary());
  const mpAggregate = Array.from(mpMap.values()).reduce((acc, e) => addSummaries(acc, e.summary), emptySummary());

  return NextResponse.json({
    year,
    month,
    daysInMonth,
    aggregates: { employees: empAggregate, manpower: mpAggregate },
    employees: Array.from(empMap.values()),
    manpower: Array.from(mpMap.values()),
  });
});
