import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (_req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await prisma.lcrSyncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json(logs);
});
