/**
 * Payroll calculator.
 *
 * Given a PayrollPeriod (year/month) this computes one PayrollLine per
 * ACTIVE employee. The full workflow is:
 *
 *   1. Resolve settings (daily rate basis, GOSI rates, OT multiplier)
 *   2. For each active employee in the period:
 *      a. Snapshot compensation columns (basic + allowances)
 *      b. Count calendar / working / holiday days in the period
 *      c. Sum approved LeaveRequest workingDays per pay class
 *         (fully paid / half paid / unpaid)
 *      d. Sum attendance overtime hours
 *      e. Compute daily/hourly rates per the configured basis
 *      f. Compute gross pay, deductions (GOSI, unpaid leaves, absences),
 *         additions (bonuses + adjustments), net
 *   3. Upsert PayrollLine rows under the period
 *   4. Stamp the period as CALCULATED with calculatedAt + calculatedBy
 *
 * This is intentionally a pure function where possible — the I/O happens
 * at the edges (load employee/leaves/attendance, save lines). It's safe
 * to rerun; existing lines for the period are deleted first.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { countWorkingDays } from './leave-balance-calculator';
import { getPayrollSettings, type PayrollSettings } from './system-config';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Resolve the daily rate according to the configured basis.
 */
function computeDailyRate(
  monthlyGross: number,
  settings: PayrollSettings,
  calendarDays: number,
  workingDays: number,
): number {
  switch (settings.dailyRateBasis) {
    case 'THIRTY':
      return monthlyGross / 30;
    case 'WORKING_DAYS_IN_MONTH':
      return workingDays > 0 ? monthlyGross / workingDays : monthlyGross / 26;
    case 'WEEKLY_AVERAGE':
      // 52 weeks × avg 6 working days ÷ 12 months = 26 days
      return monthlyGross / 26;
    default:
      return monthlyGross / 30;
  }
}

async function countEmployeeLeavesInPeriod(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  const requests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      deletedAt: null,
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
    },
    include: { leaveType: true },
  });

  let fullyPaid = 0;
  let halfPaid = 0;
  let unpaid = 0;

  for (const req of requests) {
    // Prorate any request that spans the period boundary
    const reqStart = req.startDate > periodStart ? req.startDate : periodStart;
    const reqEnd = req.endDate < periodEnd ? req.endDate : periodEnd;
    const workingDays = await countWorkingDays(reqStart, reqEnd, !req.leaveType.countPublicHolidays);
    if (req.leaveType.payType === 'FULLY_PAID') fullyPaid += workingDays;
    else if (req.leaveType.payType === 'HALF_PAID') halfPaid += workingDays;
    else unpaid += workingDays;
  }

  return { fullyPaid, halfPaid, unpaid };
}

/**
 * Pull all AttendanceRecord rows for the employee in the period, excluding
 * any day that's already covered by an APPROVED LeaveRequest (regardless of
 * source). This is the single "Dolibarr wins" dedup point per Walid, 18.6.0.
 */
async function getAttendanceRows(
  employeeId: string,
  periodStart: Date,
  periodEnd: Date,
  leaveDateSet: Set<string>,
) {
  const rows = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: { gte: periodStart, lte: periodEnd },
    },
    select: {
      date: true,
      status: true,
      overtimeHours: true,
    },
  });
  return rows.filter((r) => !leaveDateSet.has(r.date.toISOString().slice(0, 10)));
}

function sumOvertime(rows: Array<{ overtimeHours: { toString(): string } }>): number {
  let total = 0;
  for (const r of rows) total += Number(r.overtimeHours.toString());
  return total;
}

function sumAbsences(
  rows: Array<{ status: string }>,
): { withPermission: number; withoutPermission: number } {
  let withPermission = 0;
  let withoutPermission = 0;
  for (const r of rows) {
    if (r.status === 'ABSENT_WITH_PERMISSION') withPermission++;
    else if (r.status === 'ABSENT_NO_PERMISSION') withoutPermission++;
  }
  return { withPermission, withoutPermission };
}

export type PayrollCalcResult = {
  periodId: string;
  linesCreated: number;
  totalGross: number;
  totalNet: number;
};

export async function calculatePayrollPeriod(
  periodId: string,
  calculatedById: string,
): Promise<PayrollCalcResult> {
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new Error('Payroll period not found');
  if (period.status === 'LOCKED') throw new Error('Payroll period is locked');

  const settings = await getPayrollSettings();
  const periodStart = new Date(Date.UTC(period.year, period.month - 1, 1));
  const periodEnd = new Date(Date.UTC(period.year, period.month - 1, daysInMonth(period.year, period.month), 23, 59, 59));
  const calendarDays = daysInMonth(period.year, period.month);
  const workingDaysInMonth = await countWorkingDays(periodStart, periodEnd);

  // Active employees joined before or during the period
  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      dateOfJoining: { lte: periodEnd },
      OR: [{ dateOfLeaving: null }, { dateOfLeaving: { gte: periodStart } }],
    },
  });

  // Preload adjustments for this period for speed
  const adjustments = await prisma.payrollAdjustment.findMany({
    where: { periodId, deletedAt: null },
  });
  const adjByEmployee = new Map<string, typeof adjustments>();
  for (const a of adjustments) {
    if (!adjByEmployee.has(a.employeeId)) adjByEmployee.set(a.employeeId, []);
    adjByEmployee.get(a.employeeId)!.push(a);
  }

  // Clear existing lines before recalc
  await prisma.payrollLine.deleteMany({ where: { periodId } });

  let totalGross = 0;
  let totalNet = 0;
  let linesCreated = 0;

  for (const emp of employees) {
    const basic = Number(emp.basicSalary);
    const housing = Number(emp.housingAllowance);
    const transport = Number(emp.transportAllowance);
    const mobile = Number(emp.mobileAllowance);
    const food = Number(emp.foodAllowance);
    const other = Number(emp.otherAllowances);
    const monthlyGross = basic + housing + transport + mobile + food + other;

    const leaves = await countEmployeeLeavesInPeriod(emp.id, periodStart, periodEnd);

    // Build a Set of ISO dates covered by any APPROVED leave (any source).
    // Attendance rows on these dates are skipped so Dolibarr-sourced leaves
    // take precedence over Google-Sheet attendance codes.
    const leaveDateSet = new Set<string>();
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: emp.id,
        status: 'APPROVED',
        deletedAt: null,
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      select: { startDate: true, endDate: true },
    });
    for (const lr of approvedLeaves) {
      const start = lr.startDate > periodStart ? lr.startDate : periodStart;
      const end = lr.endDate < periodEnd ? lr.endDate : periodEnd;
      const cur = new Date(start);
      while (cur <= end) {
        leaveDateSet.add(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    const attendanceRows = await getAttendanceRows(emp.id, periodStart, periodEnd, leaveDateSet);
    const overtimeHours = sumOvertime(attendanceRows);
    const { withPermission, withoutPermission } = sumAbsences(attendanceRows);

    const dailyRate = computeDailyRate(monthlyGross, settings, calendarDays, workingDaysInMonth);
    // Overtime is calculated on basic salary only (Saudi Labor Law compliance)
    const basicDailyRate = computeDailyRate(basic, settings, calendarDays, workingDaysInMonth);
    const hourlyRate = emp.standardDailyHours > 0 ? basicDailyRate / emp.standardDailyHours : 0;

    const unpaidLeaveDeduction = round2(leaves.unpaid * dailyRate);
    const halfPaidDeduction = round2(leaves.halfPaid * dailyRate * 0.5);
    const absenceWithPermissionDeduction = round2(withPermission * dailyRate * settings.absenceWithPermissionMultiplier);
    const absenceDeduction = round2(withoutPermission * dailyRate * settings.absenceWithoutPermissionMultiplier);

    // 18.10.0 — Loan deductions: sum installmentAmount for all ACTIVE loans
    // whose startDate <= period end AND installmentsPaid < installmentsTotal.
    const activeLoans = await prisma.loan.findMany({
      where: {
        employeeId: emp.id,
        status: 'ACTIVE',
        deletedAt: null,
        startDate: { lte: periodEnd },
      },
      select: { installmentAmount: true, installmentsPaid: true, installmentsTotal: true },
    });
    const loanDeduction = round2(
      activeLoans
        .filter((l) => l.installmentsPaid < l.installmentsTotal)
        .reduce((sum, l) => sum + Number(l.installmentAmount), 0),
    );

    // 18.10.0 — Custody deductions: sum deductionAmount for OPEN/PARTIALLY_SETTLED
    // custodies where deductionAmount > 0.
    const openCustodies = await prisma.custody.findMany({
      where: {
        employeeId: emp.id,
        status: { in: ['OPEN', 'PARTIALLY_SETTLED'] },
        deletedAt: null,
        deductionAmount: { gt: 0 },
      },
      select: { id: true, amount: true, settledAmount: true, deductionAmount: true },
    });
    const custodyDeduction = round2(
      openCustodies.reduce((sum, c) => {
        const remaining = Number(c.amount) - Number(c.settledAmount);
        return sum + Math.min(Number(c.deductionAmount), remaining);
      }, 0),
    );

    // 19.2.1 — Violation deductions: sum violationAmount for traffic violations
    // within this pay period where deductFromPayroll=true and company has paid.
    const pendingViolations = await prisma.trafficViolation.findMany({
      where: {
        employeeId: emp.id,
        deductFromPayroll: true,
        deletedAt: null,
        status: 'PAID_BY_COMPANY',
        violationDate: { gte: periodStart, lte: periodEnd },
      },
      select: { violationAmount: true },
    });
    const violationDeduction = round2(
      pendingViolations.reduce((sum, v) => sum + Number(v.violationAmount), 0),
    );

    const overtimePay = round2(overtimeHours * hourlyRate * settings.overtimeMultiplier);

    // GOSI — only if the employee is subject. Based on gosiSalary, else basic+housing.
    let gosiEmployee = 0;
    let gosiEmployer = 0;
    if (emp.isGosiSubject) {
      const gosiBase = emp.gosiSalary ? Number(emp.gosiSalary) : basic + housing;
      gosiEmployee = round2(gosiBase * settings.gosiEmployeeRate);
      gosiEmployer = round2(gosiBase * settings.gosiEmployerRate);
    }

    // Adjustments
    const empAdjustments = adjByEmployee.get(emp.id) ?? [];
    let bonuses = 0;
    let otherAdditions = 0;
    let otherDeductions = 0;
    for (const a of empAdjustments) {
      const amt = Number(a.amount);
      if (a.kind === 'BONUS') bonuses += amt;
      else if (a.kind === 'DEDUCTION' || a.kind === 'FINE' || a.kind === 'ADVANCE_REPAYMENT') otherDeductions += amt;
      else otherAdditions += amt;
    }

    const totalAdditions = round2(bonuses + otherAdditions + overtimePay);
    const totalDeductions = round2(
      unpaidLeaveDeduction + halfPaidDeduction + absenceDeduction +
      absenceWithPermissionDeduction + gosiEmployee +
      loanDeduction + custodyDeduction + violationDeduction + otherDeductions,
    );
    const grossPay = round2(monthlyGross);
    const netPay = round2(grossPay + totalAdditions - totalDeductions);

    const workedDays = Math.max(
      0,
      workingDaysInMonth -
        leaves.fullyPaid -
        leaves.halfPaid -
        leaves.unpaid -
        withPermission -
        withoutPermission,
    );

    await prisma.payrollLine.create({
      data: {
        periodId,
        employeeId: emp.id,
        basicSalary: basic.toString(),
        housingAllowance: housing.toString(),
        transportAllowance: transport.toString(),
        mobileAllowance: mobile.toString(),
        foodAllowance: food.toString(),
        otherAllowances: other.toString(),
        calendarDays,
        workingDays: workingDaysInMonth,
        workedDays: workedDays.toString(),
        paidLeaveDays: leaves.fullyPaid.toString(),
        halfPaidLeaveDays: leaves.halfPaid.toString(),
        unpaidLeaveDays: leaves.unpaid.toString(),
        absentDaysWithPermission: withPermission.toString(),
        absentDaysWithoutPermission: withoutPermission.toString(),
        publicHolidayDays: '0',
        overtimeHours: overtimeHours.toString(),
        dailyRate: dailyRate.toFixed(4),
        hourlyRate: hourlyRate.toFixed(4),
        overtimePay: overtimePay.toString(),
        unpaidLeaveDeduction: (unpaidLeaveDeduction + halfPaidDeduction).toString(),
        absenceDeduction: absenceDeduction.toString(),
        absenceWithPermissionDeduction: absenceWithPermissionDeduction.toString(),
        gosiEmployee: gosiEmployee.toString(),
        gosiEmployer: gosiEmployer.toString(),
        loanDeduction: loanDeduction.toString(),
        custodyDeduction: custodyDeduction.toString(),
        violationDeduction: violationDeduction.toString(),
        otherDeductions: otherDeductions.toString(),
        bonuses: bonuses.toString(),
        otherAdditions: otherAdditions.toString(),
        grossPay: grossPay.toString(),
        totalDeductions: totalDeductions.toString(),
        totalAdditions: totalAdditions.toString(),
        netPay: netPay.toString(),
        bankName: emp.bankName,
        bankIban: emp.bankIban,
      },
    });

    totalGross += grossPay;
    totalNet += netPay;
    linesCreated += 1;
  }

  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: {
      status: 'CALCULATED',
      calculatedAt: new Date(),
      calculatedById,
    },
  });

  logger.info(
    { periodId, linesCreated, totalGross, totalNet },
    '[Payroll] Period calculated',
  );

  return { periodId, linesCreated, totalGross, totalNet };
}
