/**
 * GET /api/system-events/export
 *
 * Streams a CSV export of system events using the same filters as the main endpoint.
 * Admin/Manager only. Max 10,000 rows per export.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { systemEventService } from '@/services/system-events.service';
import { logger } from '@/lib/logger';

const MAX_EXPORT_ROWS = 10_000;

function escapeCsv(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET = withApiContext(async (req: NextRequest, session) => {
  if (!session || !['Admin', 'Manager'].includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = req.nextUrl;

    const eventType    = searchParams.get('eventType')    ?? undefined;
    const eventCategory = searchParams.get('eventCategory') ?? undefined;
    const severity     = searchParams.get('severity')     ?? undefined;
    const userId       = searchParams.get('userId')       ?? undefined;
    const entityType   = searchParams.get('entityType')   ?? undefined;
    const entityId     = searchParams.get('entityId')     ?? undefined;
    const projectId    = searchParams.get('projectId')    ?? undefined;
    const correlationId = searchParams.get('correlationId') ?? undefined;
    const search       = searchParams.get('search')       ?? undefined;
    const startDateRaw = searchParams.get('startDate');
    const endDateRaw   = searchParams.get('endDate');
    const startDate    = startDateRaw ? new Date(startDateRaw) : undefined;
    const endDate      = endDateRaw   ? new Date(endDateRaw)   : undefined;

    const { events } = await systemEventService.getEvents(
      { eventType, eventCategory, severity, userId, entityType, entityId, projectId, correlationId, search, startDate, endDate },
      MAX_EXPORT_ROWS,
      0,
    );

    const header = [
      'ID', 'Event Type', 'Category', 'Severity', 'Summary',
      'Entity Type', 'Entity ID', 'Entity Name',
      'Project ID', 'Project Number',
      'User ID', 'User Name', 'User Role',
      'IP Address', 'Correlation ID', 'Duration (ms)', 'Created At',
    ].join(',');

    const rows = events.map(ev => [
      escapeCsv(ev.id),
      escapeCsv(ev.eventType),
      escapeCsv(ev.eventCategory ?? ev.category),
      escapeCsv(ev.severity),
      escapeCsv(ev.title),
      escapeCsv(ev.entityType),
      escapeCsv(ev.entityId),
      escapeCsv(ev.entityName),
      escapeCsv(ev.projectId),
      escapeCsv(ev.projectNumber ?? ev.project?.projectNumber),
      escapeCsv(ev.userId ?? ev.user?.id),
      escapeCsv(ev.userName ?? ev.user?.name),
      escapeCsv(ev.userRole),
      escapeCsv(ev.ipAddress),
      escapeCsv(ev.correlationId),
      escapeCsv(ev.duration),
      escapeCsv(new Date(ev.createdAt).toISOString()),
    ].join(','));

    const csv = [header, ...rows].join('\r\n');

    const now = new Date().toISOString().split('T')[0];
    const filename = `system-events-${now}.csv`;

    logger.info({ userId: session.sub, count: events.length }, '[system-events/export] CSV export generated');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    logger.error({ error }, '[system-events/export] Export failed');
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
});
