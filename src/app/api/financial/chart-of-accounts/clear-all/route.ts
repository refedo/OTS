import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  try {
    // Delete all accounts from the chart of accounts
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM fin_chart_of_accounts`
    );

    logger.info({ deletedCount: result, user: auth.session.name }, 'Cleared all chart of accounts');

    return NextResponse.json({
      success: true,
      message: 'All accounts cleared',
      deletedCount: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Failed to clear chart of accounts');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
