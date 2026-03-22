import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (_req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{
    id: string;
    sn: string | null;
    projectNumber: string | null;
    projectName: string | null;
    buildingName: string | null;
    itemLabel: string | null;
    status: string | null;
    neededToDate: Date | null;
    awardedToRaw: string | null;
    poNumber: string | null;
    daysOverdue: number;
  }> = await prisma.$queryRaw`
    SELECT
      e.id,
      e.sn,
      p.projectNumber,
      p.name AS projectName,
      b.name AS buildingName,
      e.itemLabel,
      e.status,
      e.neededToDate,
      e.awardedToRaw,
      e.poNumber,
      DATEDIFF(CURDATE(), e.neededToDate) AS daysOverdue
    FROM lcr_entries e
    LEFT JOIN Project p ON e.projectId = p.id
    LEFT JOIN Building b ON e.buildingId = b.id
    WHERE e.isDeleted = false
      AND e.receivingDate IS NULL
      AND e.neededToDate < CURDATE()
      AND e.status NOT IN ('Cancelled', 'Received')
    ORDER BY daysOverdue DESC
  `;

  const data = results.map(r => ({
    ...r,
    daysOverdue: Number(r.daysOverdue),
  }));

  return NextResponse.json(data);
});
