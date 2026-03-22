import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const statuses = await prisma.lcrEntry.findMany({
    where: { isDeleted: false },
    select: { status: true },
    distinct: ['status'],
    orderBy: { status: 'asc' },
  });

  const uniqueStatuses = statuses
    .map(s => s.status)
    .filter((s): s is string => s !== null)
    .sort();

  return NextResponse.json(uniqueStatuses);
});
