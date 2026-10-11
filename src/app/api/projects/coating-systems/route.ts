import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { withApiContext } from '@/lib/api-utils';
import { resolveUserPermissions } from '@/lib/services/permission-resolution.service';
import { getCoatingSystemsReport } from '@/lib/services/projects/coating-systems-report.service';
import { logger } from '@/lib/logger';

const querySchema = z.object({
  projectId: z.string().uuid().optional(),
});

export const GET = withApiContext<unknown>(async (req: NextRequest, session) => {
  const userId = session!.userId;
  const parsed = querySchema.safeParse({
    projectId: req.nextUrl.searchParams.get('projectId') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  const permissions = await resolveUserPermissions(userId);
  const canViewAll = permissions.includes('projects.view_all');
  if (!canViewAll && !permissions.includes('projects.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const projectAccess: Prisma.ProjectWhereInput | undefined = canViewAll
    ? undefined
    : {
        OR: [
          { projectManagerId: userId },
          { salesEngineerId: userId },
          { operationsManagerId: userId },
          { assignments: { some: { userId } } },
        ],
      };

  try {
    const report = await getCoatingSystemsReport({ projectId: parsed.data.projectId, projectAccess });
    return NextResponse.json(report);
  } catch (error) {
    logger.error({ error, userId }, 'Failed to build coating systems report');
    return NextResponse.json({ error: 'Failed to load coating systems' }, { status: 500 });
  }
});
