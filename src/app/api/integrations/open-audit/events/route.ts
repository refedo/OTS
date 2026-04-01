import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { openAuditService } from '@/lib/services/open-audit.service';
import { logger } from '@/lib/logger';

const listSchema = z.object({
  status: z.enum(['pending', 'delivered', 'failed']).optional(),
  entity: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const GET = withApiContext(async (req: NextRequest): Promise<NextResponse<unknown>> => {
  const { searchParams } = new URL(req.url);
  const parsed = listSchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query params', details: parsed.error.flatten() }, { status: 400 });
  }

  const { status, entity, dateFrom, dateTo, limit, offset } = parsed.data;

  const result = await openAuditService.getLogs({
    status,
    entity,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    limit,
    offset,
  });

  return NextResponse.json(result);
});

export const POST = withApiContext(async (_req: NextRequest, session): Promise<NextResponse<unknown>> => {
  if (!['Admin', 'Manager'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await openAuditService.retryFailed();
    logger.info({ result, userId: session!.userId }, '[OpenAudit] Retry failed events triggered');
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[OpenAudit] Retry failed events error');
    return NextResponse.json({ error: 'Failed to retry events' }, { status: 500 });
  }
});
