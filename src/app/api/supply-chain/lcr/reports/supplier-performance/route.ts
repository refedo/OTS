import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (_req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  type SupplierRow = {
    supplierName: string | null;
    poCount: bigint;
    totalAwarded: string | null;
    totalWeight: string | null;
    avgPricePerTon: string | null;
  };

  const results = await prisma.$queryRaw<SupplierRow[]>`
    SELECT
      e.awardedToRaw AS supplierName,
      COUNT(DISTINCT e.poNumber) AS poCount,
      SUM(e.amount) AS totalAwarded,
      SUM(e.totalWeight) AS totalWeight,
      CASE
        WHEN SUM(e.totalWeight) > 0
        THEN ROUND(SUM(e.amount) / SUM(e.totalWeight), 2)
        ELSE NULL
      END AS avgPricePerTon
    FROM lcr_entries e
    WHERE e.isDeleted = false
      AND e.awardedToRaw IS NOT NULL
      AND e.awardedToRaw != ''
      AND e.poNumber IS NOT NULL
      AND e.poNumber != ''
    GROUP BY e.awardedToRaw
    ORDER BY totalAwarded DESC
  `;

  const data = results.map(r => ({
    supplierName: r.supplierName,
    poCount: Number(r.poCount),
    totalAwarded: r.totalAwarded ? parseFloat(r.totalAwarded) : 0,
    totalWeight: r.totalWeight ? parseFloat(r.totalWeight) : 0,
    avgPricePerTon: r.avgPricePerTon ? parseFloat(r.avgPricePerTon) : null,
  }));

  return NextResponse.json(data);
});
