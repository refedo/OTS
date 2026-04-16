import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'agent/projects/health' });

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-ots-agent-secret') === process.env.OTS_INTERNAL_API_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const staleDays = parseInt(searchParams.get('projectStaleDays') ?? '7', 10);
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'ON_HOLD'] },
      },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        status: true,
        plannedEndDate: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });

    const enriched = projects.map((p) => {
      const deliveryDate = p.plannedEndDate ?? null;
      const daysUntilDelivery = deliveryDate
        ? Math.floor((deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const daysSinceProgress = Math.floor(
        (now.getTime() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        id: p.id,
        name: p.name,
        projectNumber: p.projectNumber,
        status: p.status,
        daysSinceProgress,
        isStale: p.updatedAt < staleDate,
        deliveryDate: deliveryDate?.toISOString() ?? null,
        daysUntilDelivery,
        atRisk: daysUntilDelivery !== null && daysUntilDelivery < 14,
      };
    });

    return NextResponse.json({ projects: enriched, count: enriched.length });
  } catch (error) {
    log.error({ error }, 'Failed to fetch project health');
    return NextResponse.json({ error: 'Failed to fetch project health' }, { status: 500 });
  }
}
