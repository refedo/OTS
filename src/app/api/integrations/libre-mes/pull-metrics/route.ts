import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { libreMesService } from '@/lib/services/libre-mes.service';
import { logger } from '@/lib/logger';

const pullSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  workOrderIds: z.array(z.string().uuid()).optional(),
});

export const POST = withApiContext(async (req: NextRequest, session): Promise<NextResponse<unknown>> => {
  if (!['Admin', 'Manager', 'Engineer'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = pullSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const results = await libreMesService.pullMetrics({
      from: new Date(parsed.data.from),
      to: new Date(parsed.data.to),
      workOrderIds: parsed.data.workOrderIds,
    });
    logger.info({ results, userId: session!.userId }, '[LibreMES] Metrics pulled');
    return NextResponse.json({ results });
  } catch (error) {
    logger.error({ error }, '[LibreMES] Pull metrics failed');
    return NextResponse.json({ error: 'Pull failed', message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
});
