import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { createDolibarrClient } from '@/lib/dolibarr/dolibarr-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Map Dolibarr pcg_type to OTS account_type
function mapAccountType(pcgType: string | null): string {
  if (!pcgType) return 'expense';
  const t = pcgType.toLowerCase();
  if (t.includes('asset') || t === 'actif') return 'asset';
  if (t.includes('liabil') || t === 'passif') return 'liability';
  if (t.includes('equity') || t === 'capital') return 'equity';
  if (t.includes('income') || t.includes('revenue') || t === 'produit') return 'revenue';
  if (t.includes('expense') || t === 'charge') return 'expense';
  return 'expense';
}

export async function POST(req: Request) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  try {
    const client = createDolibarrClient();
    const dolibarrAccounts = await client.getAccountingAccounts();

    if (dolibarrAccounts.length === 0) {
      logger.warn({}, 'No accounting accounts returned from Dolibarr API');
      return NextResponse.json({ 
        error: 'No accounting accounts found in Dolibarr. This could mean: (1) The Dolibarr accountancy module is not enabled, (2) No chart of accounts has been configured in Dolibarr, or (3) The API endpoint is not accessible. Please check Dolibarr configuration.',
        suggestion: 'Go to Dolibarr > Setup > Modules > Accountancy and ensure it is enabled with a chart of accounts configured.'
      }, { status: 400 });
    }

    let created = 0, updated = 0, skipped = 0;

    for (const acc of dolibarrAccounts) {
      const accountCode = String(acc.account_number || acc.rowid);
      const accountName = acc.label || `Account ${accountCode}`;
      const accountType = mapAccountType(acc.pcg_type);
      const parentCode = acc.account_parent ? String(acc.account_parent) : null;
      const isActive = acc.active === '1' || acc.active === 1;

      if (!accountCode) {
        skipped++;
        continue;
      }

      // Check if account exists
      const existing: unknown[] = await prisma.$queryRawUnsafe(
        `SELECT id FROM fin_chart_of_accounts WHERE account_code = ?`,
        accountCode
      );

      if (existing.length > 0) {
        // Update existing
        await prisma.$executeRawUnsafe(
          `UPDATE fin_chart_of_accounts 
           SET account_name = ?, account_type = ?, parent_code = ?, is_active = ?
           WHERE account_code = ?`,
          accountName, accountType, parentCode, isActive ? 1 : 0, accountCode
        );
        updated++;
      } else {
        // Create new
        await prisma.$executeRawUnsafe(
          `INSERT INTO fin_chart_of_accounts 
           (account_code, account_name, account_type, parent_code, is_active, display_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          accountCode, accountName, accountType, parentCode, isActive ? 1 : 0, 0
        );
        created++;
      }
    }

    logger.info({ created, updated, skipped, total: dolibarrAccounts.length }, 'Synced Dolibarr accounting accounts');

    return NextResponse.json({
      success: true,
      message: `Synced ${dolibarrAccounts.length} accounts from Dolibarr`,
      created,
      updated,
      skipped,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, 'Failed to sync Dolibarr accounting accounts');
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
