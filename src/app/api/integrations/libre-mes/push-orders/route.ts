import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiContext } from '@/lib/api-utils';
import { libreMesService } from '@/lib/services/libre-mes.service';
import { logger } from '@/lib/logger';

const pushSchema = z.object({
  workOrderIds: z.array(z.string().uuid()).min(1).max(100),
});

export const POST = withApiContext(async (req: NextRequest, session): Promise<NextResponse<unknown>> => {
  if (!['Admin', 'Manager', 'Engineer'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = pushSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const results = await libreMesService.pushOrders(parsed.data.workOrderIds);
    logger.info({ count: results.length, userId: session!.userId }, '[LibreMES] Orders pushed');
    return NextResponse.json({ results });
  } catch (error) {
    logger.error({ error }, '[LibreMES] Push orders failed');
    return NextResponse.json({ error: 'Push failed', message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
});
