import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const currentId = searchParams.get('currentId');
    if (!currentId) {
      return NextResponse.json({ error: 'currentId is required' }, { status: 400 });
    }

    // Fetch all employee IDs in alphabetical order (same as the list page)
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { fullNameEn: 'asc' },
    });

    const index = employees.findIndex((e) => e.id === currentId);
    if (index === -1) {
      return NextResponse.json({ prevId: null, nextId: null, total: employees.length, currentIndex: -1 });
    }

    return NextResponse.json({
      prevId: index > 0 ? employees[index - 1].id : null,
      nextId: index < employees.length - 1 ? employees[index + 1].id : null,
      total: employees.length,
      currentIndex: index + 1,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch employee navigation');
    return NextResponse.json({ error: 'Failed to fetch navigation' }, { status: 500 });
  }
});
