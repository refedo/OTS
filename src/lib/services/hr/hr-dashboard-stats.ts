/**
 * HR dashboard aggregation service.
 *
 * Computes KPIs over a date range from the AttendanceRecord table,
 * optionally filtered + grouped by Employee.occupation / Employee.section /
 * Employee.departmentId.
 *
 * Exposed as a plain async function (no framework coupling) so the
 * /api/hr/dashboard route can call it directly.
 *
 * Phase 2.5 of OTS-MSS-HR-PAYROLL-v1.
 */

import prisma from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type HrDashboardGroupBy = 'none' | 'occupation' | 'section' | 'department';

export interface HrDashboardFilters {
  startDate: Date;
  endDate: Date; // inclusive day
  occupation?: string | null;
  section?: string | null;
  departmentId?: string | null;
  groupBy?: HrDashboardGroupBy;
}

export interface HrDashboardGroupRow {
  key: string;           // grouping key ("Welder", "Preparation", "Production", etc.)
  label: string;         // human-facing label (for department, the resolved name)
  headcount: number;     // distinct employees in this group
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  presentDays: number;
  absentDays: number;
  vacationDays: number;
  sickDays: number;
}

export interface HrDashboardTotals {
  headcount: number;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  presentDays: number;
  absentDays: number;
  vacationDays: number;
  sickDays: number;
  daysCounted: number; // calendar days in the range (inclusive)
}

export interface HrDashboardTrendPoint {
  date: string;         // YYYY-MM-DD
  regularHours: number;
  overtimeHours: number;
}

export interface TurnoverStats {
  atStart: number;
  atEnd: number;
  newHires: number;
  leavers: number;
  averageHeadcount: number;
  turnoverRate: number;
  stability: 'good' | 'normal' | 'review';
}

export interface HrDashboardResult {
  filters: {
    startDate: string;
    endDate: string;
    occupation: string | null;
    section: string | null;
    departmentId: string | null;
    departmentName: string | null;
    groupBy: HrDashboardGroupBy;
  };
  totals: HrDashboardTotals;
  groups: HrDashboardGroupRow[];
  trend: HrDashboardTrendPoint[];
  absenceMix: {
    present: number;
    absentWithPermission: number;
    absentNoPermission: number;
    annualVacation: number;
    sickLeave: number;
    weekend: number;
    publicHoliday: number;
    unknown: number;
  };
  turnover: TurnoverStats;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toNumber(v: Prisma.Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return Number(v.toString());
}

// ----------------------------------------------------------------------------
// Main entry
// ----------------------------------------------------------------------------

export async function getHrDashboardStats(
  filters: HrDashboardFilters,
): Promise<HrDashboardResult> {
  const groupBy: HrDashboardGroupBy = filters.groupBy ?? 'occupation';

  // Normalize the end date to cover the entire inclusive day.
  const startDate = new Date(Date.UTC(
    filters.startDate.getUTCFullYear(),
    filters.startDate.getUTCMonth(),
    filters.startDate.getUTCDate(),
  ));
  const endDate = new Date(Date.UTC(
    filters.endDate.getUTCFullYear(),
    filters.endDate.getUTCMonth(),
    filters.endDate.getUTCDate() + 1,
  ));

  // Pull every attendance record for the window, joined with the employee's
  // occupation / section / department so we can group in-memory. We only
  // include EMPLOYEE rows — agency manpower slots aren't part of the HR
  // dashboard's scope (they go into the payroll / cost dashboards instead).
  const employeeWhere: Prisma.EmployeeWhereInput = {
    deletedAt: null,
    ...(filters.occupation ? { occupation: filters.occupation } : {}),
    ...(filters.section ? { section: filters.section } : {}),
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
  };

  // Exact period boundaries for turnover (date-only comparison against @db.Date fields).
  const periodStart = startDate; // midnight UTC of first day
  const periodEnd = new Date(Date.UTC(
    filters.endDate.getUTCFullYear(),
    filters.endDate.getUTCMonth(),
    filters.endDate.getUTCDate(),
  ));

  const [records, departmentName, turnoverAtStart, turnoverAtEnd, turnoverNewHires, turnoverLeavers] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        workerType: 'EMPLOYEE',
        date: { gte: startDate, lt: endDate },
        employee: employeeWhere,
      },
      select: {
        date: true,
        status: true,
        regularHours: true,
        overtimeHours: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            occupation: true,
            section: true,
            departmentId: true,
            departmentRef: { select: { id: true, name: true } },
          },
        },
      },
      take: 100_000,
    }),
    filters.departmentId
      ? prisma.department.findUnique({
          where: { id: filters.departmentId },
          select: { name: true },
        })
      : Promise.resolve(null),
    // Employees active at the start of the period
    prisma.employee.count({
      where: {
        ...employeeWhere,
        dateOfJoining: { lte: periodStart },
        OR: [{ dateOfLeaving: null }, { dateOfLeaving: { gte: periodStart } }],
      },
    }),
    // Employees active at the end of the period
    prisma.employee.count({
      where: {
        ...employeeWhere,
        dateOfJoining: { lte: periodEnd },
        OR: [{ dateOfLeaving: null }, { dateOfLeaving: { gt: periodEnd } }],
      },
    }),
    // New hires during the period
    prisma.employee.count({
      where: {
        ...employeeWhere,
        dateOfJoining: { gte: periodStart, lte: periodEnd },
      },
    }),
    // Employees who left during the period
    prisma.employee.count({
      where: {
        ...employeeWhere,
        dateOfLeaving: { gte: periodStart, lte: periodEnd },
      },
    }),
  ]);

  // ----------------------------------------------------------------
  // Totals
  // ----------------------------------------------------------------
  const totals: HrDashboardTotals = {
    headcount: 0,
    regularHours: 0,
    overtimeHours: 0,
    totalHours: 0,
    presentDays: 0,
    absentDays: 0,
    vacationDays: 0,
    sickDays: 0,
    daysCounted: Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  };

  const absenceMix: HrDashboardResult['absenceMix'] = {
    present: 0,
    absentWithPermission: 0,
    absentNoPermission: 0,
    annualVacation: 0,
    sickLeave: 0,
    weekend: 0,
    publicHoliday: 0,
    unknown: 0,
  };

  // Group key → accumulator. Headcount is tracked via a Set of employeeIds per group.
  type Acc = HrDashboardGroupRow & { employeeIds: Set<string> };
  const groupMap = new Map<string, Acc>();
  const globalEmployeeIds = new Set<string>();

  // Trend: ISO date → regular+OT totals
  const trendMap = new Map<string, HrDashboardTrendPoint>();

  for (const r of records) {
    const regular = toNumber(r.regularHours);
    const overtime = toNumber(r.overtimeHours);
    const emp = r.employee;
    if (!emp) continue;

    // Totals + headcount
    if (r.employeeId) globalEmployeeIds.add(r.employeeId);
    totals.regularHours += regular;
    totals.overtimeHours += overtime;

    // Absence mix + day counters
    switch (r.status) {
      case 'PRESENT':
        absenceMix.present += 1;
        totals.presentDays += 1;
        break;
      case 'ABSENT_WITH_PERMISSION':
        absenceMix.absentWithPermission += 1;
        totals.absentDays += 1;
        break;
      case 'ABSENT_NO_PERMISSION':
        absenceMix.absentNoPermission += 1;
        totals.absentDays += 1;
        break;
      case 'ANNUAL_VACATION':
        absenceMix.annualVacation += 1;
        totals.vacationDays += 1;
        break;
      case 'SICK_LEAVE':
        absenceMix.sickLeave += 1;
        totals.sickDays += 1;
        break;
      case 'WEEKEND':
        absenceMix.weekend += 1;
        break;
      case 'PUBLIC_HOLIDAY':
        absenceMix.publicHoliday += 1;
        break;
      default:
        absenceMix.unknown += 1;
    }

    // Trend accumulator
    const dateKey = isoDate(r.date);
    const trendEntry =
      trendMap.get(dateKey) ?? { date: dateKey, regularHours: 0, overtimeHours: 0 };
    trendEntry.regularHours += regular;
    trendEntry.overtimeHours += overtime;
    trendMap.set(dateKey, trendEntry);

    // Grouping
    let key = '__all__';
    let label = 'All employees';
    if (groupBy === 'occupation') {
      key = emp.occupation ?? '__unknown__';
      label = emp.occupation ?? 'Unassigned occupation';
    } else if (groupBy === 'section') {
      key = emp.section ?? '__unknown__';
      label = emp.section ?? 'Unassigned section';
    } else if (groupBy === 'department') {
      key = emp.departmentId ?? '__unknown__';
      label = emp.departmentRef?.name ?? 'Unassigned department';
    }

    let acc = groupMap.get(key);
    if (!acc) {
      acc = {
        key,
        label,
        headcount: 0,
        regularHours: 0,
        overtimeHours: 0,
        totalHours: 0,
        presentDays: 0,
        absentDays: 0,
        vacationDays: 0,
        sickDays: 0,
        employeeIds: new Set<string>(),
      };
      groupMap.set(key, acc);
    }
    if (r.employeeId) acc.employeeIds.add(r.employeeId);
    acc.regularHours += regular;
    acc.overtimeHours += overtime;
    acc.totalHours += regular + overtime;
    if (r.status === 'PRESENT') acc.presentDays += 1;
    else if (r.status === 'ABSENT_WITH_PERMISSION' || r.status === 'ABSENT_NO_PERMISSION')
      acc.absentDays += 1;
    else if (r.status === 'ANNUAL_VACATION') acc.vacationDays += 1;
    else if (r.status === 'SICK_LEAVE') acc.sickDays += 1;
  }

  totals.totalHours = totals.regularHours + totals.overtimeHours;
  totals.headcount = globalEmployeeIds.size;

  const groups: HrDashboardGroupRow[] = [...groupMap.values()]
    .map((g) => {
      const { employeeIds, ...rest } = g;
      return { ...rest, headcount: employeeIds.size };
    })
    .sort((a, b) => b.totalHours - a.totalHours);

  const trend: HrDashboardTrendPoint[] = [...trendMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const avgHeadcount = (turnoverAtStart + turnoverAtEnd) / 2;
  const rawRate = avgHeadcount > 0 ? (turnoverLeavers / avgHeadcount) * 100 : 0;
  const turnoverRate = Math.round(rawRate * 10) / 10;
  const stability: TurnoverStats['stability'] =
    turnoverRate < 10 ? 'good' : turnoverRate <= 20 ? 'normal' : 'review';

  const turnover: TurnoverStats = {
    atStart: turnoverAtStart,
    atEnd: turnoverAtEnd,
    newHires: turnoverNewHires,
    leavers: turnoverLeavers,
    averageHeadcount: Math.round(avgHeadcount * 10) / 10,
    turnoverRate,
    stability,
  };

  return {
    filters: {
      startDate: isoDate(filters.startDate),
      endDate: isoDate(filters.endDate),
      occupation: filters.occupation ?? null,
      section: filters.section ?? null,
      departmentId: filters.departmentId ?? null,
      departmentName: departmentName?.name ?? null,
      groupBy,
    },
    totals,
    groups,
    trend,
    absenceMix,
    turnover,
  };
}
