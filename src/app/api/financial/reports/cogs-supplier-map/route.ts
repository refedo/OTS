import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifySession } from '@/lib/jwt';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RawRow {
  account_code: string | null;
  account_name: string | null;
  account_category: string | null;
  supplier_id: number | string;
  supplier_name: string;
  total_ht: string;
  invoice_count: string | number;
}

interface SupplierEntry {
  supplier_id: number;
  supplier_name: string;
  total_spend: number;
  invoice_count: number;
  pct: number;
}

interface AccountEntry {
  account_code: string;
  account_name: string;
  account_category: string;
  total_spend: number;
  supplier_count: number;
  invoice_count: number;
  suppliers: SupplierEntry[];
}

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [hasFinancial, hasSupplyChain] = await Promise.all([
    checkPermission('financial.view'),
    checkPermission('supply_chain.view'),
  ]);
  if (!hasFinancial && !hasSupplyChain) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'from and to date parameters are required' },
      { status: 400 }
    );
  }

  try {
    const rows: RawRow[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(pcoa.account_code, scoa.account_code, 'UNCLASSIFIED') AS account_code,
        COALESCE(pcoa.account_name, scoa.account_name, 'Unclassified') AS account_name,
        COALESCE(pcoa.account_category, scoa.account_category, 'Unclassified') AS account_category,
        si.socid AS supplier_id,
        COALESCE(dt.name, CONCAT('Supplier #', si.socid)) AS supplier_name,
        SUM(sil.total_ht) AS total_ht,
        COUNT(DISTINCT si.dolibarr_id) AS invoice_count
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = sil.fk_product
      LEFT JOIN fin_chart_of_accounts pcoa ON pcoa.account_code = pm.coa_account_code
      LEFT JOIN fin_supplier_coa_default sd ON sd.supplier_dolibarr_id = si.socid
      LEFT JOIN fin_chart_of_accounts scoa ON scoa.account_code = sd.coa_account_code
      WHERE si.is_active = 1
        AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
      GROUP BY account_code, account_name, account_category, si.socid, supplier_name
      HAVING SUM(sil.total_ht) > 0
      ORDER BY SUM(sil.total_ht) DESC
    `, from, to);

    const accountMap = new Map<string, AccountEntry>();

    for (const row of rows) {
      const acctKey = (row.account_code as string) ?? 'UNCLASSIFIED';
      const spend = Number(row.total_ht);
      const invCount = Number(row.invoice_count);

      if (!accountMap.has(acctKey)) {
        accountMap.set(acctKey, {
          account_code: acctKey,
          account_name: (row.account_name as string) ?? 'Unclassified',
          account_category: (row.account_category as string) ?? 'Unclassified',
          total_spend: 0,
          supplier_count: 0,
          invoice_count: 0,
          suppliers: [],
        });
      }

      const entry = accountMap.get(acctKey)!;
      entry.total_spend += spend;
      entry.invoice_count += invCount;
      entry.suppliers.push({
        supplier_id: Number(row.supplier_id),
        supplier_name: row.supplier_name as string,
        total_spend: spend,
        invoice_count: invCount,
        pct: 0,
      });
    }

    const accounts: AccountEntry[] = Array.from(accountMap.values())
      .sort((a, b) => b.total_spend - a.total_spend)
      .map((acct) => {
        acct.supplier_count = acct.suppliers.length;
        acct.suppliers.sort((a, b) => b.total_spend - a.total_spend);
        acct.suppliers = acct.suppliers.map((s) => ({
          ...s,
          pct: acct.total_spend > 0 ? (s.total_spend / acct.total_spend) * 100 : 0,
        }));
        return acct;
      });

    const totalSpend = accounts.reduce((s, a) => s + a.total_spend, 0);
    const allSupplierIds = new Set(accounts.flatMap((a) => a.suppliers.map((s) => s.supplier_id)));

    return NextResponse.json({
      summary: {
        totalSpend,
        accountCount: accounts.length,
        supplierCount: allSupplierIds.size,
        topAccountName: accounts[0]?.account_name ?? '—',
      },
      accounts,
    });
  } catch (error: unknown) {
    logger.error({ error }, '[cogs-supplier-map] Query failed');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Query failed' },
      { status: 500 }
    );
  }
}
