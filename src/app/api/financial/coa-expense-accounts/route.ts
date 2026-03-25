import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const accounts: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT account_code, account_name, account_name_ar, account_category, parent_code
      FROM fin_chart_of_accounts
      WHERE account_type = 'expense' AND is_active = 1
      ORDER BY display_order, account_code
    `);

    // Group by account_category for dropdown use
    const grouped: Record<string, unknown[]> = {};
    for (const acct of accounts as Record<string, unknown>[]) {
      const cat = (acct.account_category as string) || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(acct);
    }

    return NextResponse.json({ accounts, grouped });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch COA expense accounts');
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
