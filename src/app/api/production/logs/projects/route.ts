import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

/**
 * Returns the distinct list of projects that have at least one production log.
 * Used to populate the project filter dropdown on the Production Logs page —
 * bypasses the projects.view_all permission gate so users see all projects
 * that actually have logs, not just the ones they manage.
 */
export const GET = withApiContext(async (_req, _session) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        assemblyParts: {
          some: {
            productionLogs: { some: {} },
          },
        },
      },
      select: {
        id: true,
        projectNumber: true,
        name: true,
      },
      orderBy: { projectNumber: 'asc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch projects for production logs filter');
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
});
