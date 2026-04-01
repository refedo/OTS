import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { libreMesService } from '@/lib/services/libre-mes.service';
import { logger } from '@/lib/logger';

export const GET = withApiContext(async (): Promise<NextResponse<unknown>> => {
  const status = await libreMesService.getSyncStatus();
  return NextResponse.json(status);
});

export const POST = withApiContext(async (_req: NextRequest, session): Promise<NextResponse<unknown>> => {
  if (!['Admin', 'Manager'].includes(session!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await libreMesService.fullSync('manual', session!.userId);
    logger.info({ syncLogId: result.syncLogId, durationMs: result.durationMs, userId: session!.userId }, '[LibreMES] Full sync completed');
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, '[LibreMES] Full sync failed');
    return NextResponse.json({ error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
});
