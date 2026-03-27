/**
 * GET /api/system-events
 *
 * Returns a paginated, filtered list of system events.
 * Admin-only endpoint.
 *
 * Query params:
 *   eventType       - exact event type filter (e.g. "PROJECT_CREATED")
 *   eventCategory   - new-style category (e.g. "PROJECT", "AUTH", "SYSTEM")
 *   category        - legacy category filter
 *   severity        - "INFO" | "WARNING" | "ERROR" | "CRITICAL"
 *   userId          - filter by user who triggered the event
 *   entityType      - e.g. "Project", "Task"
 *   entityId        - entity UUID
 *   projectId       - project UUID
 *   correlationId   - correlation group ID
 *   search          - substring search across summary, title, entityName, eventType
 *   startDate       - ISO 8601 start of date range
 *   endDate         - ISO 8601 end of date range
 *   limit           - page size (default 50, max 200)
 *   offset          - skip N rows (default 0)
 *   stats           - if "true", include aggregate statistics in the response
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { systemEventService } from '@/services/system-events.service';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (req: NextRequest, session) => {
  if (!session || !['Admin', 'Manager', 'CEO'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = req.nextUrl;

    // ── Filters ──────────────────────────────────────────────────────────────
    const eventType = searchParams.get('eventType') ?? undefined;
    const eventCategory = searchParams.get('eventCategory') ?? undefined;
    const category = searchParams.get('category') ?? undefined;
    const severity = searchParams.get('severity') ?? undefined;
    const userId = searchParams.get('userId') ?? undefined;
    const entityType = searchParams.get('entityType') ?? undefined;
    const entityId = searchParams.get('entityId') ?? undefined;
    const projectId = searchParams.get('projectId') ?? undefined;
    const correlationId = searchParams.get('correlationId') ?? undefined;
    const search = searchParams.get('search') ?? undefined;

    const startDateRaw = searchParams.get('startDate');
    const endDateRaw = searchParams.get('endDate');
    const startDate = startDateRaw ? new Date(startDateRaw) : undefined;
    const endDate = endDateRaw ? new Date(endDateRaw) : undefined;

    // ── Pagination ────────────────────────────────────────────────────────────
    const limitRaw = parseInt(searchParams.get('limit') ?? '50', 10);
    const limit = isNaN(limitRaw) ? 50 : Math.min(Math.max(limitRaw, 1), 200);
    const offsetRaw = parseInt(searchParams.get('offset') ?? '0', 10);
    const offset = isNaN(offsetRaw) ? 0 : Math.max(offsetRaw, 0);

    // ── Include stats? ────────────────────────────────────────────────────────
    const includeStats = searchParams.get('stats') === 'true';
    const includeDaily = searchParams.get('daily') === 'true';
    const dailyDays = Math.min(parseInt(searchParams.get('days') ?? '7', 10) || 7, 30);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const [{ events, total }, stats, dailyStats] = await Promise.all([
      systemEventService.getEvents(
        {
          eventType,
          eventCategory,
          category,
          severity,
          userId,
          entityType,
          entityId,
          projectId,
          correlationId,
          search,
          startDate,
          endDate,
        },
        limit,
        offset
      ),
      includeStats ? systemEventService.getStats(projectId) : Promise.resolve(null),
      includeDaily ? systemEventService.getDailyStats(dailyDays) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      events,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      ...(stats ? { stats } : {}),
      ...(dailyStats ? { dailyStats } : {}),
    });
  } catch (error) {
    logger.error({ error }, '[system-events] Failed to fetch system events');
    return NextResponse.json({ error: 'Failed to fetch system events' }, { status: 500 });
  }
});
