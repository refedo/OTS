/**
 * GET /api/hr/loans/all
 * Returns all loans (for HR: hr.loans.view) or own loans (for linked employees).
 * 18.18.1
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (_req, session) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: session!.sub },
      select: { customPermissions: true, employeeId: true, role: { select: { permissions: true } } },
    });

    const perms: string[] = Array.isArray(user?.customPermissions)
      ? (user!.customPermissions as string[])
      : Array.isArray(user?.role?.permissions)
        ? (user!.role!.permissions as string[])
        : [];

    const canViewAll = perms.includes('hr.loans.view') || perms.includes('hr.loans.manage');

    const loans = await prisma.loan.findMany({
      where: canViewAll
        ? { deletedAt: null }
        : { deletedAt: null, employeeId: user?.employeeId ?? '__none__' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        principal: true,
        installmentAmount: true,
        installmentsTotal: true,
        installmentsPaid: true,
        startDate: true,
        status: true,
        reason: true,
        exceedsYearWarning: true,
        createdAt: true,
        employee: { select: { id: true, fullNameEn: true, employmentId: true, occupation: true } },
      },
    });

    return NextResponse.json(loans);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch all loans');
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
});
