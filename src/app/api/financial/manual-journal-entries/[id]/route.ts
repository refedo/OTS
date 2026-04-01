import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// DELETE /api/financial/manual-journal-entries/[piece_num]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const pieceNum = parseInt(id, 10);
  if (isNaN(pieceNum)) {
    return NextResponse.json({ error: 'Invalid piece_num' }, { status: 400 });
  }

  try {
    const result: unknown[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM fin_journal_entries WHERE piece_num = ? AND is_locked = 1`,
      pieceNum,
    );
    const cnt = Number((result as Record<string, unknown>[])[0]?.cnt ?? 0);
    if (cnt === 0) {
      return NextResponse.json({ error: 'Manual journal entry not found' }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM fin_journal_entries WHERE piece_num = ? AND is_locked = 1`,
      pieceNum,
    );

    logger.info({ piece_num: pieceNum }, 'Manual journal entry deleted');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to delete manual journal entry');
    return NextResponse.json({ error: 'Failed to delete manual journal entry' }, { status: 500 });
  }
}
