/**
 * HR Monthly Report Service — v23.2.0
 *
 * Extracts and aggregates all HR metrics for a given year/month:
 *  • New hires & departures (resignations / terminations)
 *  • Employee Turnover Rate  = (leavers ÷ avg headcount) × 100
 *  • Burnout Indicator       = composite 0-100 index
 *  • Leave statistics        = requests, approvals, breakdown by type
 *  • Iqama & document renewals expiring / recently expired
 *  • Payroll KPIs            = gross, net, avg salary, GOSI
 *  • Executive summary       = plain-text narrative
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'HrMonthlyReportService' });

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HireRecord {
  employmentId: string;
  fullNameEn: string;
  occupation: string | null;
  department: string | null;
  dateOfJoining: string;
}

export interface DepartureRecord {
  employmentId: string;
  fullNameEn: string;
  occupation: string | null;
  department: string | null;
  dateOfLeaving: string;
  reason: 'RESIGNED' | 'TERMINATED';
}

export interface LeaveTypeBreakdown {
  typeId: string;
  typeName: string;
  count: number;
  totalDays: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  type: string;
  employeeName: string | null;
  expiryDate: string;
  daysUntilExpiry: number;
}

export interface BurnoutComponents {
  overtimeScore: number;       // 0–25
  absenteeismScore: number;    // 0–25
  openRequestsScore: number;   // 0–25
  turnoverScore: number;       // 0–25
}

export interface HrMonthlyReportData {
  period: {
    year: number;
    month: number;
    label: string;
  };

  headcount: {
    atStart: number;
    atEnd: number;
    newHires: HireRecord[];
    resignations: DepartureRecord[];
    terminations: DepartureRecord[];
  };

  turnover: {
    rate: number;
    leavers: number;
    avgHeadcount: number;
    rating: 'good' | 'normal' | 'review';
  };

  burnout: {
    score: number;
    level: 'low' | 'moderate' | 'high' | 'critical';
    components: BurnoutComponents;
    avgOvertimeHours: number;
    absenteeismRate: number;
    avgOpenRequests: number;
    departmentalTurnoverRate: number;
  };

  leave: {
    totalRequests: number;
    approved: number;
    rejected: number;
    pending: number;
    cancelled: number;
    byType: LeaveTypeBreakdown[];
    avgDaysPerEmployee: number;
  };

  documents: {
    iqamaExpired: DocumentRecord[];
    iqamaDueSoon: DocumentRecord[];       // expiring within 60 days from month-end
    workPermitsDueSoon: DocumentRecord[];
    insuranceDueSoon: DocumentRecord[];
    otherDueSoon: DocumentRecord[];
  };

  payroll: {
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
    gosiEmployer: number;
    gosiEmployee: number;
    avgNetSalary: number;
    employeesPaid: number;
    periodFound: boolean;
    periodStatus: string | null;
  };

  executiveSummary: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'toString' in (v as object)) return Number((v as { toString(): string }).toString());
  return Number(v);
}

function clamp(n: number, max: number): number {
  return Math.min(n, max);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function buildMonthlyReportData(
  year: number,
  month: number,
): Promise<HrMonthlyReportData> {
  const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  log.info({ year, month }, '[HrMonthlyReport] Building report data');

  // Period boundaries (UTC date objects)
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd   = new Date(Date.UTC(year, month, 0));      // last day of month
  const periodEndExclusive = new Date(Date.UTC(year, month, 1));

  // "Due soon" window = 60 days past month-end
  const dueSoonCutoff = new Date(Date.UTC(year, month, 0 + 60));

  // ── 1. Headcount & movement ───────────────────────────────────────────────

  const [atStart, atEnd, rawNewHires, rawDepartures] = await Promise.all([
    // Active at start of month
    prisma.employee.count({
      where: {
        deletedAt: null,
        dateOfJoining: { lte: periodStart },
        OR: [{ dateOfLeaving: null }, { dateOfLeaving: { gte: periodStart } }],
      },
    }),
    // Active at end of month
    prisma.employee.count({
      where: {
        deletedAt: null,
        dateOfJoining: { lte: periodEnd },
        OR: [{ dateOfLeaving: null }, { dateOfLeaving: { gt: periodEnd } }],
      },
    }),
    // Joined during the month
    prisma.employee.findMany({
      where: {
        deletedAt: null,
        dateOfJoining: { gte: periodStart, lte: periodEnd },
      },
      select: {
        employmentId: true,
        fullNameEn: true,
        occupation: true,
        department: true,
        dateOfJoining: true,
      },
      orderBy: { dateOfJoining: 'asc' },
    }),
    // Left during the month
    prisma.employee.findMany({
      where: {
        deletedAt: null,
        dateOfLeaving: { gte: periodStart, lte: periodEnd },
        status: { in: ['RESIGNED', 'TERMINATED'] },
      },
      select: {
        employmentId: true,
        fullNameEn: true,
        occupation: true,
        department: true,
        dateOfLeaving: true,
        status: true,
      },
      orderBy: { dateOfLeaving: 'asc' },
    }),
  ]);

  const newHires: HireRecord[] = rawNewHires.map((e) => ({
    employmentId: e.employmentId,
    fullNameEn: e.fullNameEn,
    occupation: e.occupation,
    department: e.department,
    dateOfJoining: isoDate(e.dateOfJoining),
  }));

  const resignations: DepartureRecord[] = rawDepartures
    .filter((e) => e.status === 'RESIGNED')
    .map((e) => ({
      employmentId: e.employmentId,
      fullNameEn: e.fullNameEn,
      occupation: e.occupation,
      department: e.department,
      dateOfLeaving: isoDate(e.dateOfLeaving!),
      reason: 'RESIGNED' as const,
    }));

  const terminations: DepartureRecord[] = rawDepartures
    .filter((e) => e.status === 'TERMINATED')
    .map((e) => ({
      employmentId: e.employmentId,
      fullNameEn: e.fullNameEn,
      occupation: e.occupation,
      department: e.department,
      dateOfLeaving: isoDate(e.dateOfLeaving!),
      reason: 'TERMINATED' as const,
    }));

  // ── 2. Turnover Rate ──────────────────────────────────────────────────────
  //  (leavers ÷ avg headcount) × 100

  const totalLeavers = resignations.length + terminations.length;
  const avgHeadcount = (atStart + atEnd) / 2;
  const rawTurnover  = avgHeadcount > 0 ? (totalLeavers / avgHeadcount) * 100 : 0;
  const turnoverRate = round2(rawTurnover);
  const turnoverRating: 'good' | 'normal' | 'review' =
    turnoverRate < 5 ? 'good' : turnoverRate <= 15 ? 'normal' : 'review';

  // ── 3. Attendance data (for burnout) ──────────────────────────────────────

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      workerType: 'EMPLOYEE',
      date: { gte: periodStart, lt: periodEndExclusive },
      employee: { deletedAt: null },
    },
    select: {
      employeeId: true,
      status: true,
      overtimeHours: true,
    },
    take: 200_000,
  });

  // Per-employee OT and absences
  const empOtMap    = new Map<string, number>();
  const empAbsMap   = new Map<string, number>();
  const empDaysMap  = new Map<string, number>();

  for (const r of attendanceRecords) {
    if (!r.employeeId) continue;
    const ot    = toNum(r.overtimeHours);
    const cur   = empOtMap.get(r.employeeId) ?? 0;
    empOtMap.set(r.employeeId, cur + ot);

    const days = empDaysMap.get(r.employeeId) ?? 0;
    empDaysMap.set(r.employeeId, days + 1);

    if (r.status === 'ABSENT_NO_PERMISSION') {
      const abs = empAbsMap.get(r.employeeId) ?? 0;
      empAbsMap.set(r.employeeId, abs + 1);
    }
  }

  const totalEmployeesWithAttendance = empOtMap.size;
  const totalOtHours  = [...empOtMap.values()].reduce((s, v) => s + v, 0);
  const totalAbsDays  = [...empAbsMap.values()].reduce((s, v) => s + v, 0);
  const totalWorkDays = [...empDaysMap.values()].reduce((s, v) => s + v, 0);

  const avgOvertimeHours   = totalEmployeesWithAttendance > 0
    ? totalOtHours / totalEmployeesWithAttendance
    : 0;
  const absenteeismRate = totalWorkDays > 0
    ? (totalAbsDays / totalWorkDays) * 100
    : 0;

  // ── 4. Open leave requests per employee ───────────────────────────────────

  const openRequests = await prisma.leaveRequest.count({
    where: {
      deletedAt: null,
      status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_CEO'] },
    },
  });

  const activeHeadcount = atEnd > 0 ? atEnd : 1;
  const avgOpenRequests = openRequests / activeHeadcount;

  // ── 5. Burnout Score (composite 0–100) ───────────────────────────────────
  //
  // Component         Max    Threshold
  // Overtime          25     40 hrs/month saturates at max
  // Absenteeism       25     10% absence rate saturates at max
  // Open requests     25     2 open requests/person saturates at max
  // Departmental OT   25     Uses turnover rate (>20% → saturates)

  const OT_THRESHOLD       = 40;  // hrs / employee / month
  const ABS_THRESHOLD      = 10;  // % of working days
  const OPEN_REQ_THRESHOLD = 2;   // requests per employee
  const TURNOVER_THRESHOLD = 20;  // % monthly turnover

  const overtimeScore    = round2(clamp((avgOvertimeHours  / OT_THRESHOLD)       * 25, 25));
  const absenteeismScore = round2(clamp((absenteeismRate   / ABS_THRESHOLD)      * 25, 25));
  const openReqScore     = round2(clamp((avgOpenRequests   / OPEN_REQ_THRESHOLD) * 25, 25));
  const turnoverScore    = round2(clamp((turnoverRate      / TURNOVER_THRESHOLD) * 25, 25));

  const burnoutScore = round2(overtimeScore + absenteeismScore + openReqScore + turnoverScore);
  const burnoutLevel: 'low' | 'moderate' | 'high' | 'critical' =
    burnoutScore <= 25  ? 'low'
    : burnoutScore <= 50  ? 'moderate'
    : burnoutScore <= 75  ? 'high'
    : 'critical';

  // ── 6. Leave requests this month ─────────────────────────────────────────

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: periodStart, lt: periodEndExclusive },
    },
    select: {
      status: true,
      startDate: true,
      endDate: true,
      leaveType: { select: { id: true, nameEn: true } },
    },
  });

  let approved = 0, rejected = 0, pending = 0, cancelled = 0;
  const typeMap = new Map<string, { typeName: string; count: number; totalDays: number }>();

  for (const r of leaveRequests) {
    if (r.status === 'APPROVED') approved++;
    else if (r.status === 'REJECTED') rejected++;
    else if (r.status === 'CANCELLED') cancelled++;
    else pending++;

    const typeId   = r.leaveType?.id ?? '__unknown__';
    const typeName = r.leaveType?.nameEn ?? 'Unknown';
    const days     = r.startDate && r.endDate
      ? Math.max(1, Math.round((r.endDate.getTime() - r.startDate.getTime()) / 86400000) + 1)
      : 1;

    const acc = typeMap.get(typeId) ?? { typeName, count: 0, totalDays: 0 };
    acc.count++;
    acc.totalDays += days;
    typeMap.set(typeId, acc);
  }

  const byType: LeaveTypeBreakdown[] = [...typeMap.entries()].map(([typeId, v]) => ({
    typeId,
    typeName: v.typeName,
    count: v.count,
    totalDays: v.totalDays,
  })).sort((a, b) => b.count - a.count);

  const totalApprovedDays = byType.reduce((s, t) => s + t.totalDays, 0);
  const avgDaysPerEmployee = activeHeadcount > 0 ? round2(totalApprovedDays / activeHeadcount) : 0;

  // ── 7. Documents (Iqama + others) ────────────────────────────────────────

  // Iqama expired during the month or currently expired
  const iqamaExpiredRaw = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      type: 'IQAMA',
      expiryDate: { lte: periodEnd },
      status: { in: ['EXPIRED', 'ACTIVE'] },
    },
    select: {
      id: true, title: true, type: true, expiryDate: true,
      employee: { select: { fullNameEn: true } },
    },
    orderBy: { expiryDate: 'asc' },
  });

  // Iqama due soon (expiring within 60 days from end of month)
  const iqamaDueSoonRaw = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      type: 'IQAMA',
      expiryDate: { gt: periodEnd, lte: dueSoonCutoff },
      status: { in: ['ACTIVE', 'PENDING_RENEWAL'] },
    },
    select: {
      id: true, title: true, type: true, expiryDate: true,
      employee: { select: { fullNameEn: true } },
    },
    orderBy: { expiryDate: 'asc' },
  });

  // Other documents due soon (work permits, insurance, etc.)
  const otherDocsDueSoonRaw = await prisma.contract.findMany({
    where: {
      deletedAt: null,
      type: { notIn: ['IQAMA'] },
      expiryDate: { gte: periodStart, lte: dueSoonCutoff },
      status: { in: ['ACTIVE', 'PENDING_RENEWAL'] },
    },
    select: {
      id: true, title: true, type: true, expiryDate: true,
      employee: { select: { fullNameEn: true } },
    },
    orderBy: { expiryDate: 'asc' },
  });

  function toDocRecord(r: {
    id: string; title: string; type: string; expiryDate: Date | null;
    employee: { fullNameEn: string } | null;
  }): DocumentRecord {
    const expDate  = r.expiryDate ? isoDate(r.expiryDate) : '';
    const diffMs   = r.expiryDate ? r.expiryDate.getTime() - periodEnd.getTime() : 0;
    const daysLeft = Math.round(diffMs / 86400000);
    return {
      id: r.id,
      title: r.title,
      type: r.type,
      employeeName: r.employee?.fullNameEn ?? null,
      expiryDate: expDate,
      daysUntilExpiry: daysLeft,
    };
  }

  const iqamaExpired    = iqamaExpiredRaw.map(toDocRecord);
  const iqamaDueSoon    = iqamaDueSoonRaw.map(toDocRecord);
  const workPermitsDueSoon = otherDocsDueSoonRaw
    .filter((d) => d.type === 'PROFESSIONAL_LICENSE' || d.type === 'VEHICLE_LICENSE')
    .map(toDocRecord);
  const insuranceDueSoon = otherDocsDueSoonRaw
    .filter((d) => d.type === 'HEALTH_INSURANCE' || d.type === 'MEDICAL_INSURANCE')
    .map(toDocRecord);
  const otherDueSoon = otherDocsDueSoonRaw
    .filter((d) => !['PROFESSIONAL_LICENSE', 'VEHICLE_LICENSE', 'HEALTH_INSURANCE', 'MEDICAL_INSURANCE'].includes(d.type))
    .map(toDocRecord);

  // ── 8. Payroll KPIs ───────────────────────────────────────────────────────

  const payrollPeriod = await prisma.payrollPeriod.findFirst({
    where: { year, month, deletedAt: null },
    select: {
      id: true,
      status: true,
      lines: {
        select: {
          grossPay: true,
          netPay: true,
          totalDeductions: true,
          gosiEmployee: true,
          gosiEmployer: true,
        },
      },
    },
  });

  let totalGross = 0, totalNet = 0, totalDeductions = 0;
  let gosiEmployee = 0, gosiEmployer = 0;
  let employeesPaid = 0;

  if (payrollPeriod) {
    for (const line of payrollPeriod.lines) {
      totalGross       += toNum(line.grossPay);
      totalNet         += toNum(line.netPay);
      totalDeductions  += toNum(line.totalDeductions);
      gosiEmployee     += toNum(line.gosiEmployee);
      gosiEmployer     += toNum(line.gosiEmployer);
      employeesPaid++;
    }
  }

  const avgNetSalary = employeesPaid > 0 ? round2(totalNet / employeesPaid) : 0;

  // ── 9. Executive Summary ─────────────────────────────────────────────────

  const executiveSummary = buildExecutiveSummary({
    periodLabel,
    atEnd,
    newHires: newHires.length,
    totalLeavers,
    turnoverRate,
    turnoverRating,
    burnoutScore,
    burnoutLevel,
    avgOvertimeHours,
    absenteeismRate,
    leaveTotal: leaveRequests.length,
    leaveApproved: approved,
    iqamaExpired: iqamaExpired.length,
    iqamaDueSoon: iqamaDueSoon.length,
    docsDueSoon: workPermitsDueSoon.length + insuranceDueSoon.length + otherDueSoon.length,
    totalPayroll: round2(totalGross),
    employeesPaid,
    periodFound: !!payrollPeriod,
  });

  const data: HrMonthlyReportData = {
    period: { year, month, label: periodLabel },
    headcount: { atStart, atEnd, newHires, resignations, terminations },
    turnover: { rate: turnoverRate, leavers: totalLeavers, avgHeadcount: round2(avgHeadcount), rating: turnoverRating },
    burnout: {
      score: burnoutScore,
      level: burnoutLevel,
      components: { overtimeScore, absenteeismScore, openRequestsScore: openReqScore, turnoverScore },
      avgOvertimeHours: round2(avgOvertimeHours),
      absenteeismRate: round2(absenteeismRate),
      avgOpenRequests: round2(avgOpenRequests),
      departmentalTurnoverRate: turnoverRate,
    },
    leave: {
      totalRequests: leaveRequests.length,
      approved,
      rejected,
      pending,
      cancelled,
      byType,
      avgDaysPerEmployee,
    },
    documents: { iqamaExpired, iqamaDueSoon, workPermitsDueSoon, insuranceDueSoon, otherDueSoon },
    payroll: {
      totalGross: round2(totalGross),
      totalNet: round2(totalNet),
      totalDeductions: round2(totalDeductions),
      gosiEmployer: round2(gosiEmployer),
      gosiEmployee: round2(gosiEmployee),
      avgNetSalary,
      employeesPaid,
      periodFound: !!payrollPeriod,
      periodStatus: payrollPeriod?.status ?? null,
    },
    executiveSummary,
  };

  log.info({ year, month, burnoutScore, turnoverRate }, '[HrMonthlyReport] Data built successfully');
  return data;
}

// ─── Executive summary generator ────────────────────────────────────────────

interface SummaryParams {
  periodLabel: string;
  atEnd: number;
  newHires: number;
  totalLeavers: number;
  turnoverRate: number;
  turnoverRating: 'good' | 'normal' | 'review';
  burnoutScore: number;
  burnoutLevel: 'low' | 'moderate' | 'high' | 'critical';
  avgOvertimeHours: number;
  absenteeismRate: number;
  leaveTotal: number;
  leaveApproved: number;
  iqamaExpired: number;
  iqamaDueSoon: number;
  docsDueSoon: number;
  totalPayroll: number;
  employeesPaid: number;
  periodFound: boolean;
}

function buildExecutiveSummary(p: SummaryParams): string {
  const lines: string[] = [];

  lines.push(
    `HR Monthly Report — ${p.periodLabel}`,
    '',
    `Workforce: ${p.atEnd} active employees at month-end. ` +
    `${p.newHires} new hire${p.newHires !== 1 ? 's' : ''} joined, ` +
    `${p.totalLeavers} employee${p.totalLeavers !== 1 ? 's' : ''} departed.`,
    '',
  );

  // Turnover
  const turnoverVerdict =
    p.turnoverRating === 'good'   ? 'within a healthy range'
    : p.turnoverRating === 'normal' ? 'at a normal level'
    : 'above recommended thresholds and requires attention';
  lines.push(
    `Turnover: The monthly turnover rate is ${p.turnoverRate.toFixed(1)}%, ${turnoverVerdict}.`,
    '',
  );

  // Burnout
  const burnoutVerdict =
    p.burnoutLevel === 'low'      ? 'Low burnout risk — workforce is in good condition.'
    : p.burnoutLevel === 'moderate' ? 'Moderate burnout indicators — monitor overtime and leave backlogs.'
    : p.burnoutLevel === 'high'     ? 'High burnout risk — proactive intervention is recommended.'
    : 'Critical burnout risk — immediate HR action required.';
  lines.push(
    `Burnout Index: ${p.burnoutScore.toFixed(0)}/100 — ${burnoutVerdict}`,
    `  Average overtime: ${p.avgOvertimeHours.toFixed(1)} hrs/employee. ` +
    `Unauthorised absence rate: ${p.absenteeismRate.toFixed(1)}%.`,
    '',
  );

  // Leave
  lines.push(
    `Leave: ${p.leaveTotal} request${p.leaveTotal !== 1 ? 's' : ''} submitted ` +
    `(${p.leaveApproved} approved).`,
    '',
  );

  // Documents
  if (p.iqamaExpired > 0 || p.iqamaDueSoon > 0 || p.docsDueSoon > 0) {
    const docParts: string[] = [];
    if (p.iqamaExpired > 0)  docParts.push(`${p.iqamaExpired} expired Iqama${p.iqamaExpired !== 1 ? 's' : ''}`);
    if (p.iqamaDueSoon > 0)  docParts.push(`${p.iqamaDueSoon} Iqama${p.iqamaDueSoon !== 1 ? 's' : ''} due within 60 days`);
    if (p.docsDueSoon > 0)   docParts.push(`${p.docsDueSoon} other document${p.docsDueSoon !== 1 ? 's' : ''} due soon`);
    lines.push(`Documents: ${docParts.join('; ')}.`, '');
  } else {
    lines.push('Documents: All documents are current — no urgent renewals required.', '');
  }

  // Payroll
  if (p.periodFound) {
    lines.push(
      `Payroll: Total gross payroll SAR ${p.totalPayroll.toLocaleString('en-SA-u-ca-gregory', { minimumFractionDigits: 0 })} ` +
      `covering ${p.employeesPaid} employee${p.employeesPaid !== 1 ? 's' : ''}.`,
    );
  } else {
    lines.push('Payroll: No payroll period found for this month.');
  }

  return lines.join('\n');
}
