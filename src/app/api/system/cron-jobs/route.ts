import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { CRON_JOB_REGISTRY, isCronEnabled } from '@/lib/cron-registry';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const GET = withApiContext(async (_req, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await checkPermission('settings.view_cron');
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const jobs = CRON_JOB_REGISTRY.map((job) => ({
      id: job.id,
      name: job.name,
      description: job.description,
      scheduleExpression: job.scheduleExpression,
      scheduleHuman: job.scheduleHuman,
      enabled: isCronEnabled(job),
      hasEndpoint: !!job.endpoint,
      category: job.category,
      enabledEnvVar: job.enabledEnvVar,
      intervalEnvVar: job.intervalEnvVar,
      intervalValue: job.intervalEnvVar ? (process.env[job.intervalEnvVar] ?? null) : null,
    }));

    return NextResponse.json({ jobs });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch cron jobs');
    return NextResponse.json({ error: 'Failed to fetch cron jobs' }, { status: 500 });
  }
});
