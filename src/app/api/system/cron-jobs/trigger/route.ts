import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { CRON_JOB_REGISTRY } from '@/lib/cron-registry';
import { logger } from '@/lib/logger';

const triggerSchema = z.object({
  jobId: z.string().min(1),
});

export const POST = withApiContext(async (req: NextRequest, session) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await checkPermission('settings.manage_cron');
  if (!hasAccess) return NextResponse.json({ error: 'Forbidden: settings.manage_cron required' }, { status: 403 });

  const body = await req.json();
  const parsed = triggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const job = CRON_JOB_REGISTRY.find((j) => j.id === parsed.data.jobId);
  if (!job) return NextResponse.json({ error: 'Unknown job ID' }, { status: 404 });
  if (!job.endpoint) {
    return NextResponse.json({ error: 'This job has no HTTP endpoint (internal scheduler only)' }, { status: 400 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured on the server' }, { status: 500 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  let url: string;

  try {
    if (job.authMode === 'query') {
      url = `${baseUrl}${basePath}${job.endpoint}?secret=${encodeURIComponent(cronSecret)}`;
    } else {
      url = `${baseUrl}${basePath}${job.endpoint}`;
    }

    const start = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers:
        job.authMode === 'bearer'
          ? { Authorization: `Bearer ${cronSecret}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' },
    });

    const elapsed = Date.now() - start;
    let result: unknown;
    try {
      result = await res.json();
    } catch {
      result = { raw: await res.text() };
    }

    logger.info({ jobId: job.id, status: res.status, elapsed, triggeredBy: session.userId }, 'Cron job manually triggered');

    return NextResponse.json({ success: res.ok, status: res.status, elapsed, result });
  } catch (error) {
    logger.error({ error, jobId: job.id }, 'Failed to trigger cron job');
    return NextResponse.json({ error: 'Failed to call cron endpoint' }, { status: 500 });
  }
});
