import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  projectId: z.string().optional(),
});

export const GET = withApiContext<any>(async (req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url!);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = querySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { projectId } = parsed.data;

  type StatusRow = { status: string | null; totalWeight: string | null };

  const results: StatusRow[] = projectId
    ? await prisma.$queryRaw<StatusRow[]>`
        SELECT e.status, SUM(e.totalWeight) AS totalWeight
        FROM lcr_entries e
        WHERE e.isDeleted = false AND e.totalWeight IS NOT NULL AND e.totalWeight > 0
          AND e.projectId = ${projectId}
        GROUP BY e.status
        ORDER BY totalWeight DESC
      `
    : await prisma.$queryRaw<StatusRow[]>`
        SELECT e.status, SUM(e.totalWeight) AS totalWeight
        FROM lcr_entries e
        WHERE e.isDeleted = false AND e.totalWeight IS NOT NULL AND e.totalWeight > 0
        GROUP BY e.status
        ORDER BY totalWeight DESC
      `;

  const data = results.map(r => ({
    status: r.status ?? 'Unknown',
    totalWeight: r.totalWeight ? parseFloat(r.totalWeight) : 0,
  }));

  // Calculate total and percentages
  const total = data.reduce((sum, row) => sum + row.totalWeight, 0);
  const withPercentages = data.map(row => ({
    ...row,
    percentage: total > 0 ? Math.round((row.totalWeight / total) * 100) : 0,
  }));

  return NextResponse.json({
    data: withPercentages,
    total,
  });
});
