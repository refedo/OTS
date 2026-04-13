/**
 * Leave balance calculator.
 *
 * For a given (employee, leaveType, year) this computes:
 *   opening   = carried over from previous year, capped at leaveType.maxCarryOverDays
 *   accrued   = leaveType.monthlyAccrualDays × completed months since hire or Jan 1
 *   used      = sum of APPROVED LeaveRequest workingDays within the year
 *   available = opening + accrued − used + manualAdjustment
 *
 * Used counters are split by payType so the UI can surface:
 *   - fully paid / half paid / unpaid days taken
 *   - absent with permission vs without permission are tracked on the
 *     payroll-line level (populated from attendance candidates resolved to
 *     the employee); they're NOT leave-balance affected.
 */

import prisma from '@/lib/db';

export type LeaveBalanceSnapshot = {
  employeeId: string;
  leaveTypeId: string;
  year: number;
  openingBalance: number;
  accruedYtd: number;
  usedYtd: number;
  usedFullyPaid: number;
  usedHalfPaid: number;
  usedUnpaid: number;
  carriedOver: number;
  manualAdjustment: number;
  available: number;
  asOfDate: Date;
};

function monthsBetween(from: Date, to: Date): number {
  if (to < from) return 0;
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const days = to.getDate() - from.getDate();
  return Math.max(0, years * 12 + months + (days >= 0 ? 0 : -1));
}

export async function computeLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  asOf: Date = new Date(),
): Promise<LeaveBalanceSnapshot> {
  const [employee, leaveType] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.leaveType.findUnique({ where: { id: leaveTypeId } }),
  ]);
  if (!employee || !leaveType) {
    throw new Error('Employee or leave type not found');
  }

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const accrualStart = employee.dateOfJoining > yearStart ? employee.dateOfJoining : yearStart;
  const accrualEnd = asOf < yearEnd ? asOf : yearEnd;

  const completedMonths = monthsBetween(accrualStart, accrualEnd);
  const accrued = Number(leaveType.monthlyAccrualDays) * completedMonths;

  // Carry-over comes from last year's stored row, capped at the leave type's max.
  const previousRow = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId,
        leaveTypeId,
        year: year - 1,
      },
    },
  });
  const previousBalance = previousRow
    ? Number(previousRow.openingBalance) +
      Number(previousRow.accruedYtd) +
      Number(previousRow.manualAdjustment) -
      Number(previousRow.usedYtd)
    : 0;
  const maxCarry = Number(leaveType.maxCarryOverDays);
  const carriedOver = Math.min(Math.max(0, previousBalance), maxCarry);
  const openingBalance = carriedOver;

  // Sum used days from approved leave requests within the year for this type.
  const approvedRequests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      leaveTypeId,
      status: 'APPROVED',
      deletedAt: null,
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
    },
    include: { leaveType: true },
  });

  let usedYtd = 0;
  let usedFullyPaid = 0;
  let usedHalfPaid = 0;
  let usedUnpaid = 0;
  for (const req of approvedRequests) {
    const days = Number(req.workingDays);
    usedYtd += days;
    if (req.leaveType.payType === 'FULLY_PAID') usedFullyPaid += days;
    else if (req.leaveType.payType === 'HALF_PAID') usedHalfPaid += days;
    else usedUnpaid += days;
  }

  // Optional manual adjustment from the stored row
  const currentRow = await prisma.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });
  const manualAdjustment = currentRow ? Number(currentRow.manualAdjustment) : 0;

  const available = openingBalance + accrued - usedYtd + manualAdjustment;

  return {
    employeeId,
    leaveTypeId,
    year,
    openingBalance,
    accruedYtd: accrued,
    usedYtd,
    usedFullyPaid,
    usedHalfPaid,
    usedUnpaid,
    carriedOver,
    manualAdjustment,
    available,
    asOfDate: asOf,
  };
}

export async function refreshLeaveBalanceCache(
  employeeId: string,
  leaveTypeId: string,
  year: number,
): Promise<void> {
  const snap = await computeLeaveBalance(employeeId, leaveTypeId, year);
  await prisma.leaveBalance.upsert({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    create: {
      employeeId,
      leaveTypeId,
      year,
      openingBalance: snap.openingBalance,
      accruedYtd: snap.accruedYtd,
      usedYtd: snap.usedYtd,
      carriedOver: snap.carriedOver,
      manualAdjustment: snap.manualAdjustment,
      asOfDate: snap.asOfDate,
    },
    update: {
      openingBalance: snap.openingBalance,
      accruedYtd: snap.accruedYtd,
      usedYtd: snap.usedYtd,
      carriedOver: snap.carriedOver,
      asOfDate: snap.asOfDate,
    },
  });
}

/**
 * Count working days in a date range, excluding Fridays and optionally
 * excluding PublicHoliday rows. Saturday–Thursday = working week.
 */
export async function countWorkingDays(startDate: Date, endDate: Date, skipHolidays = true): Promise<number> {
  if (endDate < startDate) return 0;
  const holidaySet = new Set<string>();
  if (skipHolidays) {
    const holidays = await prisma.publicHoliday.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true },
    });
    for (const h of holidays) holidaySet.add(h.date.toISOString().slice(0, 10));
  }
  let count = 0;
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dow = cur.getUTCDay(); // 0=Sun … 5=Fri, 6=Sat
    const isoDate = cur.toISOString().slice(0, 10);
    if (dow !== 5 && !holidaySet.has(isoDate)) {
      count += 1;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}
