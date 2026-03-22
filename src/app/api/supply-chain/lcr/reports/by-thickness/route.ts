import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (_req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{
    thickness: string | null;
    totalWeight: string | null;
    totalAmount: string | null;
    itemCount: bigint;
  }> = await prisma.$queryRaw`
    SELECT
      COALESCE(e.thickness, 'Unknown') AS thickness,
      SUM(e.totalWeight) AS totalWeight,
      SUM(e.amount) AS totalAmount,
      COUNT(*) AS itemCount
    FROM lcr_entries e
    WHERE e.isDeleted = false
    GROUP BY COALESCE(e.thickness, 'Unknown')
    ORDER BY totalWeight DESC
  `;

  const data = results.map(r => ({
    thickness: r.thickness ?? 'Unknown',
    totalWeight: r.totalWeight ? parseFloat(r.totalWeight) : 0,
    totalAmount: r.totalAmount ? parseFloat(r.totalAmount) : 0,
    itemCount: Number(r.itemCount),
  }));

  return NextResponse.json(data);
});
