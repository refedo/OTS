import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (_req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{
    month: string;
    totalWeight: string | null;
    totalAmount: string | null;
    itemCount: bigint;
  }> = await prisma.$queryRaw`
    SELECT
      DATE_FORMAT(e.buyingDate, '%Y-%m') AS month,
      SUM(e.totalWeight) AS totalWeight,
      SUM(e.amount) AS totalAmount,
      COUNT(*) AS itemCount
    FROM lcr_entries e
    WHERE e.isDeleted = false
      AND e.buyingDate IS NOT NULL
      AND e.totalWeight IS NOT NULL
      AND e.totalWeight > 0
    GROUP BY DATE_FORMAT(e.buyingDate, '%Y-%m')
    ORDER BY month ASC
  `;

  const data = results.map(r => ({
    month: r.month,
    totalWeight: r.totalWeight ? parseFloat(r.totalWeight) : 0,
    totalAmount: r.totalAmount ? parseFloat(r.totalAmount) : 0,
    itemCount: Number(r.itemCount),
  }));

  return NextResponse.json(data);
});
