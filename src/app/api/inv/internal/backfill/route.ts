/**
 * POST /api/inv/internal/backfill
 * Admin-only: triggers a retroactive MIR stock-in backfill.
 * Safe to call multiple times — per-item idempotency prevents double-posting.
 */
import { NextRequest, NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { backfillMirStockIn } from '@/lib/services/qc/mir-stock-sync.service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const POST = withApiContext(async (_req: NextRequest, session) => {
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info({ userId: session.userId }, '[INV] Manual MIR stock backfill triggered');

  const result = await backfillMirStockIn();

  logger.info({ userId: session.userId, ...result }, '[INV] Manual MIR stock backfill complete');

  return NextResponse.json({
    success: true,
    posted: result.totalPosted,
    skipped: result.totalSkipped,
  });
});
