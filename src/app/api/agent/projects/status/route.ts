import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'agent/projects/status' });

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

    const staleProjects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'ON_HOLD'] },
        updatedAt: { lt: staleDate },
      },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: 30,
    });

    const statusIssues = staleProjects.map((p) => ({
      id: p.id,
      name: p.name,
      projectNumber: p.projectNumber,
      status: p.status,
      lastUpdate: p.updatedAt.toISOString(),
      daysSinceUpdate: Math.floor((now.getTime() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
      issue: 'No status update in ' + Math.floor((now.getTime() - p.updatedAt.getTime()) / (1000 * 60 * 60 * 24)) + ' days',
    }));

    return NextResponse.json({ statusIssues, count: statusIssues.length });
  } catch (error) {
    log.error({ error }, 'Failed to fetch project status issues');
    return NextResponse.json({ error: 'Failed to fetch project status issues' }, { status: 500 });
  }
}
