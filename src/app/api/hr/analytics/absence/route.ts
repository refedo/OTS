/**
 * GET /api/hr/analytics/absence
 *
 * Behavioral pattern analysis over AttendanceRecord + LeaveRequest data.
 * Surfaces consecutive-absence streaks, Monday/Friday extension patterns,
 * escalating absence trends, and leave-request frequency anomalies so
 * management can intervene before payroll deductions become the only signal.
 *
 * Query params:
 *   months      Lookback in full calendar months (1–12, default 6)
 *   section     Optional employee section filter
 *   occupation  Optional employee occupation filter
 *
 * Gated by hr.analytics.view (19.4.0).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';
import prisma from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlertType =
  | 'CONSECUTIVE_ABSENCE'
  | 'WEEKEND_EXTENSION'
  | 'ESCALATING_ABSENCES'
  | 'FREQUENT_LEAVES';

type Severity = 'HIGH' | 'MEDIUM';

export interface PatternFlag {
  employeeId: string;
  employmentId: string;
  fullNameEn: string;
  occupation: string | null;
  section: string | null;
  alertType: AlertType;
  severity: Severity;
  detail: string;
  meta: Record<string, unknown>;
}

export interface EmployeeAbsenceStat {
  employeeId: string;
  employmentId: string;
  fullNameEn: string;
  occupation: string | null;
  section: string | null;
  monthlyAnp: Record<string, number>;
  totalAnp: number;
  totalAp: number;
  totalSick: number;
  totalAv: number;
  longestConsecutiveAnp: number;
  mondayFridayPct: number;
  leaveRequestCount: number;
  leavesByType: Record<string, number>;
}

export interface AbsenceAnalyticsResult {
  period: { from: string; to: string; months: number };
  summary: {
    totalAnpDays: number;
    totalApDays: number;
    employeesWithAnp: number;
    flaggedEmployees: number;
    totalApprovedLeaves: number;
  };
  flags: PatternFlag[];
  employeeStats: EmployeeAbsenceStat[];
  dayOfWeekDistribution: Record<string, number>;
  monthlyTrend: Array<{ month: string; anpDays: number; apDays: number; sickDays: number }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Two ANP dates are part of the same consecutive streak if their gap is ≤ 3 days
 *  (bridges a Fri/Sat/Sun weekend so Thu→Mon counts as consecutive). */
function isConsecutiveGap(a: Date, b: Date): boolean {
  const diffMs = b.getTime() - a.getTime();
  const diffDays = diffMs / 86_400_000;
  return diffDays > 0 && diffDays <= 3;
}

/** Find longest run of "consecutive" ANP dates (weekends transparent). */
function longestStreak(dates: Date[]): { length: number; start: Date; end: Date } | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let best = { length: 1, start: sorted[0], end: sorted[0] };
  let runStart = sorted[0];
  let runLen = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (isConsecutiveGap(sorted[i - 1], sorted[i])) {
      runLen++;
      if (runLen > best.length) {
        best = { length: runLen, start: runStart, end: sorted[i] };
      }
    } else {
      runStart = sorted[i];
      runLen = 1;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const canView = await checkPermission('hr.analytics.view');
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const monthsRaw = Number(url.searchParams.get('months') ?? '6');
  const months = Math.min(Math.max(1, Number.isNaN(monthsRaw) ? 6 : monthsRaw), 12);
  const section = url.searchParams.get('section') || null;
  const occupation = url.searchParams.get('occupation') || null;

  // Period: last N complete calendar months ending on last day of previous month.
  const now = new Date();
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); // last day of prev month
  const startDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - months + 1, 1));
  // If we're past the 1st, include the current partial month too
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const effectiveEnd = todayUtc > endDate ? todayUtc : endDate;

  const employeeFilter = {
    deletedAt: null as null,
    ...(section ? { section } : {}),
    ...(occupation ? { occupation } : {}),
  };

  try {
    // Fetch attendance records (EMPLOYEE only) + leave requests in parallel
    const [records, leaveRequests] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: {
          workerType: 'EMPLOYEE',
          date: { gte: startDate, lte: effectiveEnd },
          employee: employeeFilter,
        },
        select: {
          employeeId: true,
          date: true,
          status: true,
          employee: {
            select: {
              id: true,
              employmentId: true,
              fullNameEn: true,
              occupation: true,
              section: true,
            },
          },
        },
        take: 200_000,
        orderBy: { date: 'asc' },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: effectiveEnd },
          endDate: { gte: startDate },
          deletedAt: null,
          employee: employeeFilter,
        },
        select: {
          employeeId: true,
          startDate: true,
          endDate: true,
          calendarDays: true,
          leaveType: { select: { code: true, nameEn: true } },
        },
      }),
    ]);

    // ---------------------------------------------------------------------------
    // Build per-employee accumulators
    // ---------------------------------------------------------------------------

    type EmpAcc = {
      employeeId: string;
      employmentId: string;
      fullNameEn: string;
      occupation: string | null;
      section: string | null;
      anpDates: Date[];
      apCount: number;
      sickCount: number;
      avCount: number;
      monthlyAnp: Map<string, number>;
      dayOfWeekAnp: number[]; // index 0=Sun..6=Sat
    };

    const empMap = new Map<string, EmpAcc>();

    function getEmp(rec: (typeof records)[0]): EmpAcc {
      const emp = rec.employee;
      if (!emp) throw new Error('Missing employee on attendance record');
      let acc = empMap.get(emp.id);
      if (!acc) {
        acc = {
          employeeId: emp.id,
          employmentId: emp.employmentId,
          fullNameEn: emp.fullNameEn,
          occupation: emp.occupation,
          section: emp.section,
          anpDates: [],
          apCount: 0,
          sickCount: 0,
          avCount: 0,
          monthlyAnp: new Map(),
          dayOfWeekAnp: [0, 0, 0, 0, 0, 0, 0],
        };
        empMap.set(emp.id, acc);
      }
      return acc;
    }

    // Day-of-week distribution (company-wide ANP)
    const dowDistribution: number[] = [0, 0, 0, 0, 0, 0, 0];

    // Monthly trend accumulator
    const monthlyTrendMap = new Map<string, { anpDays: number; apDays: number; sickDays: number }>();

    for (const rec of records) {
      if (!rec.employee) continue;
      const acc = getEmp(rec);
      const date = new Date(rec.date);
      const mk = monthKey(date);
      const dow = date.getUTCDay();

      if (!monthlyTrendMap.has(mk)) {
        monthlyTrendMap.set(mk, { anpDays: 0, apDays: 0, sickDays: 0 });
      }
      const trend = monthlyTrendMap.get(mk)!;

      switch (rec.status) {
        case 'ABSENT_NO_PERMISSION':
          acc.anpDates.push(date);
          acc.dayOfWeekAnp[dow]++;
          dowDistribution[dow]++;
          acc.monthlyAnp.set(mk, (acc.monthlyAnp.get(mk) ?? 0) + 1);
          trend.anpDays++;
          break;
        case 'ABSENT_WITH_PERMISSION':
          acc.apCount++;
          trend.apDays++;
          break;
        case 'SICK_LEAVE':
          acc.sickCount++;
          trend.sickDays++;
          break;
        case 'ANNUAL_VACATION':
          acc.avCount++;
          break;
      }
    }

    // ---------------------------------------------------------------------------
    // Build per-employee leave request stats
    // ---------------------------------------------------------------------------

    type LeaveAcc = {
      totalCount: number;
      monthlyCount: Map<string, number>;
      byType: Map<string, number>;
    };

    const leaveMap = new Map<string, LeaveAcc>();

    for (const lr of leaveRequests) {
      let lacc = leaveMap.get(lr.employeeId);
      if (!lacc) {
        lacc = { totalCount: 0, monthlyCount: new Map(), byType: new Map() };
        leaveMap.set(lr.employeeId, lacc);
      }
      lacc.totalCount++;
      const mk = monthKey(new Date(lr.startDate));
      lacc.monthlyCount.set(mk, (lacc.monthlyCount.get(mk) ?? 0) + 1);
      const typeCode = lr.leaveType?.code ?? 'UNKNOWN';
      lacc.byType.set(typeCode, (lacc.byType.get(typeCode) ?? 0) + 1);
    }

    // ---------------------------------------------------------------------------
    // Compute stats + detect patterns
    // ---------------------------------------------------------------------------

    const flags: PatternFlag[] = [];
    const employeeStats: EmployeeAbsenceStat[] = [];

    for (const acc of empMap.values()) {
      const streak = longestStreak(acc.anpDates);
      const longestConsecutiveAnp = streak?.length ?? 0;

      // Monday/Friday ratio among ANP days (mon=1, fri=5 in getUTCDay)
      const totalAnp = acc.anpDates.length;
      const monFriAnp = acc.dayOfWeekAnp[1] + acc.dayOfWeekAnp[5];
      const mondayFridayPct = totalAnp > 0 ? Math.round((monFriAnp / totalAnp) * 100) : 0;

      const lacc = leaveMap.get(acc.employeeId);
      const leaveRequestCount = lacc?.totalCount ?? 0;
      const leavesByType: Record<string, number> = {};
      lacc?.byType.forEach((v: number, k: string) => { leavesByType[k] = v; });

      // Build monthlyAnp as plain object
      const monthlyAnp: Record<string, number> = {};
      acc.monthlyAnp.forEach((v: number, k: string) => { monthlyAnp[k] = v; });

      employeeStats.push({
        employeeId: acc.employeeId,
        employmentId: acc.employmentId,
        fullNameEn: acc.fullNameEn,
        occupation: acc.occupation,
        section: acc.section,
        monthlyAnp,
        totalAnp,
        totalAp: acc.apCount,
        totalSick: acc.sickCount,
        totalAv: acc.avCount,
        longestConsecutiveAnp,
        mondayFridayPct,
        leaveRequestCount,
        leavesByType,
      });

      // --- Pattern A: Consecutive Absence ---
      if (longestConsecutiveAnp >= 3 && streak) {
        const severity: Severity = longestConsecutiveAnp >= 5 ? 'HIGH' : 'MEDIUM';
        flags.push({
          employeeId: acc.employeeId,
          employmentId: acc.employmentId,
          fullNameEn: acc.fullNameEn,
          occupation: acc.occupation,
          section: acc.section,
          alertType: 'CONSECUTIVE_ABSENCE',
          severity,
          detail: `${longestConsecutiveAnp} consecutive absent-without-permission days (${isoDate(streak.start)} → ${isoDate(streak.end)})`,
          meta: { streakDays: longestConsecutiveAnp, from: isoDate(streak.start), to: isoDate(streak.end) },
        });
      }

      // --- Pattern B: Weekend Extension (Mon/Fri bias) ---
      if (totalAnp >= 5 && mondayFridayPct > 60) {
        const severity: Severity = mondayFridayPct > 70 ? 'HIGH' : 'MEDIUM';
        flags.push({
          employeeId: acc.employeeId,
          employmentId: acc.employmentId,
          fullNameEn: acc.fullNameEn,
          occupation: acc.occupation,
          section: acc.section,
          alertType: 'WEEKEND_EXTENSION',
          severity,
          detail: `${mondayFridayPct}% of absences fall on Monday or Friday (${monFriAnp} of ${totalAnp} ANP days)`,
          meta: { mondayFridayPct, monFriAnp, totalAnp, mondayAnp: acc.dayOfWeekAnp[1], fridayAnp: acc.dayOfWeekAnp[5] },
        });
      }

      // --- Pattern C: Escalating Absences ---
      const sortedMonths = Object.keys(monthlyAnp).sort();
      if (sortedMonths.length >= 3) {
        const last3 = sortedMonths.slice(-3);
        const [m1, m2, m3] = last3.map(m => monthlyAnp[m] ?? 0);
        if (m1 < m2 && m2 < m3 && m3 >= 2) {
          const severity: Severity = m3 > 5 ? 'HIGH' : 'MEDIUM';
          flags.push({
            employeeId: acc.employeeId,
            employmentId: acc.employmentId,
            fullNameEn: acc.fullNameEn,
            occupation: acc.occupation,
            section: acc.section,
            alertType: 'ESCALATING_ABSENCES',
            severity,
            detail: `ANP days increasing: ${m1}→${m2}→${m3} over last 3 months (${last3.join(', ')})`,
            meta: { trend: [m1, m2, m3], months: last3 },
          });
        }
      }

      // --- Pattern D: Frequent Leave Requests ---
      if (lacc) {
        let maxMonthlyLeaves = 0;
        let peakMonth = '';
        lacc.monthlyCount.forEach((v: number, k: string) => {
          if (v > maxMonthlyLeaves) { maxMonthlyLeaves = v; peakMonth = k; }
        });
        if (maxMonthlyLeaves >= 3) {
          const severity: Severity = maxMonthlyLeaves >= 4 ? 'HIGH' : 'MEDIUM';
          flags.push({
            employeeId: acc.employeeId,
            employmentId: acc.employmentId,
            fullNameEn: acc.fullNameEn,
            occupation: acc.occupation,
            section: acc.section,
            alertType: 'FREQUENT_LEAVES',
            severity,
            detail: `${maxMonthlyLeaves} approved leave requests in a single month (${peakMonth}); ${leaveRequestCount} total over period`,
            meta: { maxMonthlyLeaves, peakMonth, totalLeaves: leaveRequestCount },
          });
        }
      }
    }

    // Deduplicate flags: one flag per employee per alert type (keep highest severity)
    const flagKey = (f: PatternFlag) => `${f.employeeId}:${f.alertType}`;
    const flagMap = new Map<string, PatternFlag>();
    for (const f of flags) {
      const k = flagKey(f);
      const existing = flagMap.get(k);
      if (!existing || (existing.severity === 'MEDIUM' && f.severity === 'HIGH')) {
        flagMap.set(k, f);
      }
    }
    const dedupedFlags = [...flagMap.values()].sort(
      (a, b) => (a.severity === 'HIGH' ? -1 : 1) - (b.severity === 'HIGH' ? -1 : 1),
    );

    // ---------------------------------------------------------------------------
    // Summaries
    // ---------------------------------------------------------------------------

    const totalAnpDays = employeeStats.reduce((s, e) => s + e.totalAnp, 0);
    const totalApDays = employeeStats.reduce((s, e) => s + e.totalAp, 0);
    const employeesWithAnp = employeeStats.filter(e => e.totalAnp > 0).length;
    const flaggedEmployeeIds = new Set(dedupedFlags.map(f => f.employeeId));

    const dowDistributionObj: Record<string, number> = {};
    DAY_NAMES.forEach((name, i) => {
      if (i >= 1 && i <= 5) dowDistributionObj[name] = dowDistribution[i]; // Mon–Fri only
    });

    const monthlyTrend = [...monthlyTrendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v }));

    const result: AbsenceAnalyticsResult = {
      period: { from: isoDate(startDate), to: isoDate(effectiveEnd), months },
      summary: {
        totalAnpDays,
        totalApDays,
        employeesWithAnp,
        flaggedEmployees: flaggedEmployeeIds.size,
        totalApprovedLeaves: leaveRequests.length,
      },
      flags: dedupedFlags,
      employeeStats: employeeStats.sort((a, b) => b.totalAnp - a.totalAnp),
      dayOfWeekDistribution: dowDistributionObj,
      monthlyTrend,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[HR Analytics] Failed to compute absence analytics');
    return NextResponse.json({ error: 'Failed to compute absence analytics' }, { status: 500 });
  }
}
