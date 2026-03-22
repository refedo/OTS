import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (_req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{
    projectNumber: string | null;
    projectName: string | null;
    status: string | null;
    itemCount: bigint;
    totalAmount: string | null;
    totalWeight: string | null;
  }> = await prisma.$queryRaw`
    SELECT
      p.projectNumber,
      p.name AS projectName,
      e.status,
      COUNT(*) AS itemCount,
      SUM(e.amount) AS totalAmount,
      SUM(e.totalWeight) AS totalWeight
    FROM lcr_entries e
    LEFT JOIN Project p ON e.projectId = p.id
    WHERE e.isDeleted = false
    GROUP BY p.projectNumber, p.name, e.status
    ORDER BY p.projectNumber, e.status
  `;

  const data = results.map(r => ({
    projectNumber: r.projectNumber,
    projectName: r.projectName,
    status: r.status,
    itemCount: Number(r.itemCount),
    totalAmount: r.totalAmount ? parseFloat(r.totalAmount) : 0,
    totalWeight: r.totalWeight ? parseFloat(r.totalWeight) : 0,
  }));

  return NextResponse.json(data);
});
