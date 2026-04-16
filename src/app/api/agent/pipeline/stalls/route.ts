import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'agent/pipeline/stalls' });

function verifySecret(req: NextRequest): boolean {
  return req.headers.get('x-ots-agent-secret') === process.env.OTS_INTERNAL_API_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const stallDays = parseInt(searchParams.get('projectStaleDays') ?? '7', 10);
    const staleDate = new Date(Date.now() - stallDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const buildings = await prisma.building.findMany({
      where: {
        deletedAt: null,
        project: {
          deletedAt: null,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'ON_HOLD'] },
        },
        updatedAt: { lt: staleDate },
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        project: { select: { id: true, name: true, projectNumber: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 50,
    });

    const stalls = buildings.map((b) => ({
      jobId: b.id,
      jobName: b.name ?? b.id,
      projectId: b.project.id,
      projectName: b.project.name,
      projectNumber: b.project.projectNumber,
      stage: 'ACTIVE',
      daysStuck: Math.floor((now.getTime() - b.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      lastActivity: b.updatedAt.toISOString(),
    }));

    return NextResponse.json({ stalls, count: stalls.length, stallThresholdDays: stallDays });
  } catch (error) {
    log.error({ error }, 'Failed to fetch pipeline stalls');
    return NextResponse.json({ error: 'Failed to fetch pipeline stalls' }, { status: 500 });
  }
}
