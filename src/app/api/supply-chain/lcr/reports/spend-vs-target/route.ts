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
    totalSpend: string | null;
    totalTarget: string | null;
    variancePct: string | null;
  }> = await prisma.$queryRaw`
    SELECT
      p.projectNumber,
      p.name AS projectName,
      SUM(e.amount) AS totalSpend,
      SUM(e.targetPrice) AS totalTarget,
      ROUND((SUM(e.amount) - SUM(e.targetPrice)) / NULLIF(SUM(e.targetPrice), 0) * 100, 2) AS variancePct
    FROM lcr_entries e
    LEFT JOIN Project p ON e.projectId = p.id
    WHERE e.isDeleted = false AND e.status NOT IN ('Requested', 'Cancelled')
    GROUP BY p.projectNumber, p.name
    ORDER BY p.projectNumber
  `;

  const data = results.map(r => ({
    projectNumber: r.projectNumber,
    projectName: r.projectName,
    totalSpend: r.totalSpend ? parseFloat(r.totalSpend) : 0,
    totalTarget: r.totalTarget ? parseFloat(r.totalTarget) : 0,
    variancePct: r.variancePct ? parseFloat(r.variancePct) : null,
  }));

  return NextResponse.json(data);
});
