import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (_req, session) => {
  try {
    const [perms, user] = await Promise.all([
      resolveUserPermissions(session!.userId),
      prisma.user.findUnique({ where: { id: session!.userId }, select: { employeeId: true } }),
    ]);

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
