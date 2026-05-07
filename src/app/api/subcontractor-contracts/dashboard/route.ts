import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getDashboardStats } from '@/lib/services/subcontractor-contract.service';

export const GET = withApiContext(async (_req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    logger.error({ error }, '[SC Dashboard] Failed to fetch stats');
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
});
