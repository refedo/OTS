/**
 * GET /api/hr/my-entitlement
 * Returns the current user's cumulative annual leave entitlement.
 * Entitlement = 1.75 days/month from dateOfJoining (all-time, not year-reset).
 * Consumed = sum of APPROVED annual leave requests (all time).
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

const MONTHLY_ACCRUAL = 1.75;

export const GET = withApiContext(async (_req, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session!.sub },
      select: { employeeId: true },
    });

    if (!user?.employeeId) {
      return NextResponse.json({ entitledDays: 0, annualConsumed: 0, remaining: 0, monthsEmployed: 0, dateOfJoining: null });
    }

    const [employee, annualLeaveType] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: user.employeeId },
        select: { dateOfJoining: true },
      }),
      prisma.leaveType.findFirst({
        where: { code: 'ANNUAL', archivedAt: null },
        select: { id: true },
      }),
    ]);

    const today = new Date();
    const joinDate = employee?.dateOfJoining ? new Date(employee.dateOfJoining) : null;
    let monthsEmployed = 0;
    let entitledDays = 0;

    if (joinDate) {
      const diffMs = today.getTime() - joinDate.getTime();
      monthsEmployed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
      entitledDays = Math.round(monthsEmployed * MONTHLY_ACCRUAL * 10) / 10;
    }

    let annualConsumed = 0;
    if (annualLeaveType) {
      const requests = await prisma.leaveRequest.findMany({
        where: {
          employeeId: user.employeeId,
          leaveTypeId: annualLeaveType.id,
          status: 'APPROVED',
          deletedAt: null,
        },
        select: { workingDays: true },
      });
      annualConsumed = Math.round(
        requests.reduce((s, r) => s + Number(r.workingDays), 0) * 10,
      ) / 10;
    }

    const remaining = Math.round((entitledDays - annualConsumed) * 10) / 10;

    return NextResponse.json({
      entitledDays,
      annualConsumed,
      remaining,
      monthsEmployed,
      dateOfJoining: employee?.dateOfJoining ?? null,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch my entitlement');
    return NextResponse.json({ error: 'Failed to fetch entitlement' }, { status: 500 });
  }
});
