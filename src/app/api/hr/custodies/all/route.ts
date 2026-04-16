/**
 * GET /api/hr/custodies/all
 * Returns all custodies (for HR: hr.custodies.view) or own (for linked employees).
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

    const canViewAll = perms.includes('hr.custodies.view') || perms.includes('hr.custodies.manage');

    const custodies = await prisma.custody.findMany({
      where: canViewAll
        ? { deletedAt: null }
        : { deletedAt: null, employeeId: user?.employeeId ?? '__none__' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        issuedDate: true,
        reason: true,
        settledAmount: true,
        deductionAmount: true,
        status: true,
        notes: true,
        createdAt: true,
        employee: { select: { id: true, fullNameEn: true, employmentId: true, occupation: true } },
      },
    });

    return NextResponse.json(custodies);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch all custodies');
    return NextResponse.json({ error: 'Failed to fetch custodies' }, { status: 500 });
  }
});
