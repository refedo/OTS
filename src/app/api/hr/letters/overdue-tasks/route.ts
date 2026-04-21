/**
 * GET /api/hr/letters/overdue-tasks?employeeId=
 * Returns overdue tasks assigned to the given employee (for task-delay letter injection).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
  }

  try {
    // Find the user account linked to this employee
    const linkedUser = await prisma.user.findFirst({
      where: { employeeId, status: 'active' },
      select: { id: true },
    });

    if (!linkedUser) {
      return NextResponse.json([]);
    }

    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        assigneeId: linkedUser.id,
        dueDate: { lt: now },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        priority: true,
        project: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    logger.error({ error, employeeId }, 'Failed to fetch overdue tasks');
    return NextResponse.json({ error: 'Failed to fetch overdue tasks' }, { status: 500 });
  }
});
