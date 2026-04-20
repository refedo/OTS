/**
 * GET /api/hr/vacation-entitlement
 * Returns per-employee vacation entitlement and consumed days by leave type.
 * Entitlement = 1.75 days/month from dateOfJoining.
 *
 * 18.17.0
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async () => {
  try {
    const [employees, leaveTypes, approvedRequests] = await Promise.all([
      prisma.employee.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          fullNameEn: true,
          employmentId: true,
          dateOfJoining: true,
        },
        orderBy: { fullNameEn: 'asc' },
      }),
      prisma.leaveType.findMany({
        where: { archivedAt: null },
        select: { id: true, code: true, nameEn: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          deletedAt: null,
          status: 'APPROVED',
        },
        select: {
          employeeId: true,
          leaveTypeId: true,
          workingDays: true,
        },
      }),
    ]);

    const today = new Date();

    const consumed: Record<string, Record<string, number>> = {};
    for (const req of approvedRequests) {
      if (!consumed[req.employeeId]) consumed[req.employeeId] = {};
      consumed[req.employeeId][req.leaveTypeId] =
        (consumed[req.employeeId][req.leaveTypeId] ?? 0) + Number(req.workingDays);
    }

    const MONTHLY_ACCRUAL = 1.75;
    const annualLeaveType = leaveTypes.find((lt) => lt.code === 'ANNUAL');

    const rows = employees.map((emp) => {
      const joinDate = emp.dateOfJoining ? new Date(emp.dateOfJoining) : null;
      let monthsEmployed = 0;
      let entitledDays = 0;

      if (joinDate) {
        const diffMs = today.getTime() - joinDate.getTime();
        monthsEmployed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
        entitledDays = Math.round(monthsEmployed * MONTHLY_ACCRUAL * 10) / 10;
      }

      const empConsumed = consumed[emp.id] ?? {};
      const totalConsumed = Object.values(empConsumed).reduce((s, v) => s + v, 0);

      const annualConsumed = annualLeaveType
        ? Math.round((empConsumed[annualLeaveType.id] ?? 0) * 10) / 10
        : 0;

      const byType: Record<string, number> = {};
      for (const lt of leaveTypes) {
        byType[lt.code] = Math.round((empConsumed[lt.id] ?? 0) * 10) / 10;
      }

      return {
        id: emp.id,
        fullNameEn: emp.fullNameEn,
        employmentId: emp.employmentId,
        dateOfJoining: emp.dateOfJoining,
        monthsEmployed,
        entitledDays,
        annualConsumed,
        totalConsumed: Math.round(totalConsumed * 10) / 10,
        remaining: Math.round((entitledDays - annualConsumed) * 10) / 10,
        byType,
      };
    });

    return NextResponse.json({ leaveTypes, rows });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch vacation entitlement');
    return NextResponse.json({ error: 'Failed to fetch entitlement data' }, { status: 500 });
  }
});
