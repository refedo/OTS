import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = withApiContext<any>(async (_req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{
    projectId: string | null;
    projectNumber: string | null;
    projectName: string | null;
  }> = await prisma.$queryRaw`
    SELECT DISTINCT
      e.projectId,
      p.projectNumber,
      p.name AS projectName
    FROM lcr_entries e
    LEFT JOIN Project p ON e.projectId = p.id
    WHERE e.isDeleted = false AND e.projectId IS NOT NULL
    ORDER BY p.projectNumber
  `;

  const projects = results
    .filter(r => r.projectId)
    .map(r => ({
      id: r.projectId!,
      number: r.projectNumber ?? 'Unknown',
      name: r.projectName ?? '',
    }));

  return NextResponse.json(projects);
});
