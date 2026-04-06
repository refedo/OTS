import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { runLcrSync } from '@/lib/sync/lcrSync';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'API:LcrSync' });

export const dynamic = 'force-dynamic';

export const POST = withApiContext<any>(async (req, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = session.role === 'Admin' || session.role === 'CEO';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden: requires supply_chain.sync permission' }, { status: 403 });
  }

  const url = new URL(req.url);
  const forceRefresh = url.searchParams.get('force') === 'true';

  try {
    const result = await runLcrSync('manual', forceRefresh);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    log.error({ error }, 'Manual LCR sync failed');
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
