import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ARCHIVE_AFTER_DAYS = 90;
const DELETE_AFTER_DAYS = 365;

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret') || req.headers.get('x-cron-secret');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const archiveCutoff = new Date();
  archiveCutoff.setDate(archiveCutoff.getDate() - ARCHIVE_AFTER_DAYS);
  archiveCutoff.setHours(0, 0, 0, 0);

  const deleteCutoff = new Date();
  deleteCutoff.setDate(deleteCutoff.getDate() - DELETE_AFTER_DAYS);
  deleteCutoff.setHours(0, 0, 0, 0);

  try {
    // ── Step 1: Aggregate events older than 90 days into summary table ──────
    const aggregated = await prisma.$executeRaw`
      INSERT INTO system_event_summaries (summary_date, event_category, event_type, severity, count, created_at, updated_at)
      SELECT
        DATE(created_at)  AS summary_date,
        event_category,
        event_type,
        severity,
        COUNT(*)          AS count,
        NOW()             AS created_at,
        NOW()             AS updated_at
      FROM system_events
      WHERE created_at < ${archiveCutoff}
      GROUP BY DATE(created_at), event_category, event_type, severity
      ON DUPLICATE KEY UPDATE
        count      = count + VALUES(count),
        updated_at = NOW()
    `;

    logger.info({ aggregated, archiveCutoff }, '[event-cleanup] Aggregated old events into summaries');

    // ── Step 2: Delete raw events older than 365 days ────────────────────────
    const deleted = await prisma.systemEvent.deleteMany({
      where: { createdAt: { lt: deleteCutoff } },
    });

    logger.info({ deleted: deleted.count, deleteCutoff }, '[event-cleanup] Deleted old raw events');

    const duration = Date.now() - startTime;

    systemEventService.logSystem('SYS_CRON_EXECUTED', {
      cronJob: 'event-cleanup',
      duration,
      aggregatedRows: aggregated,
      deletedRows: deleted.count,
    });

    return NextResponse.json({
      ok: true,
      aggregatedRows: aggregated,
      deletedRows: deleted.count,
      archiveCutoff: archiveCutoff.toISOString(),
      deleteCutoff: deleteCutoff.toISOString(),
      durationMs: duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({ error, duration }, '[event-cleanup] Cron job failed');
    systemEventService.logSystem('SYS_CRON_FAILED', {
      cronJob: 'event-cleanup',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    });
    return NextResponse.json({ error: 'Event cleanup failed' }, { status: 500 });
  }
}
