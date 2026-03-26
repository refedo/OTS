import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const projectIdsParam = searchParams.get('projectIds');
  const category = searchParams.get('category');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!projectId && !projectIdsParam && !category) {
    return NextResponse.json({ error: 'Either projectId, projectIds, or category is required' }, { status: 400 });
  }

  try {
    const params: unknown[] = [];
    const conditions: string[] = ['si.is_active = 1', 'si.status >= 1'];

    if (projectId) {
      conditions.push('si.fk_projet = ?');
      params.push(parseInt(projectId, 10));
    } else if (projectIdsParam) {
      const ids = projectIdsParam
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
      if (ids.length > 0) {
        conditions.push(`si.fk_projet IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }
    }

    if (from) {
      conditions.push('si.date_invoice >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('si.date_invoice <= ?');
      params.push(to);
    }

    // Category filter using chart of accounts (same logic as report-service.ts)
    let categoryCondition = '';
    if (category) {
      if (category === 'Other / Unclassified') {
        categoryCondition = 'AND (pcoa.account_category IS NULL AND scoa.account_category IS NULL)';
      } else {
        categoryCondition = 'AND COALESCE(pcoa.account_category, scoa.account_category) = ?';
        params.push(category);
      }
    }

    const where = conditions.join(' AND ');

    const lines: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        sil.product_ref,
        sil.product_label,
        sil.accounting_code,
        COALESCE(pcoa.account_category, scoa.account_category, 'Other / Unclassified') as cost_category,
        si.ref as invoice_ref,
        si.date_invoice,
        dt.name as supplier_name,
        dp.ref as project_ref,
        sil.qty,
        sil.unit_price_ht,
        sil.total_ht,
        sil.total_tva,
        sil.total_ttc,
        sil.vat_rate
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      LEFT JOIN dolibarr_projects dp ON dp.dolibarr_id = si.fk_projet
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = sil.fk_product
      LEFT JOIN fin_chart_of_accounts pcoa ON pcoa.account_code = pm.coa_account_code
      LEFT JOIN fin_supplier_coa_default sd ON sd.supplier_dolibarr_id = si.socid
      LEFT JOIN fin_chart_of_accounts scoa ON scoa.account_code = sd.coa_account_code
      WHERE ${where} ${categoryCondition}
      ORDER BY sil.total_ht DESC
      LIMIT 500
    `, ...params);

    // Category summary when scoped to project(s)
    let categorySummary: unknown[] = [];
    if (projectId || projectIdsParam) {
      const summaryParams: unknown[] = [];
      const summaryConditions: string[] = ['si.is_active = 1', 'si.status >= 1'];

      if (projectId) {
        summaryConditions.push('si.fk_projet = ?');
        summaryParams.push(parseInt(projectId, 10));
      } else if (projectIdsParam) {
        const ids = projectIdsParam
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id));
        if (ids.length > 0) {
          summaryConditions.push(`si.fk_projet IN (${ids.map(() => '?').join(',')})`);
          summaryParams.push(...ids);
        }
      }

      categorySummary = await prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(pcoa.account_category, scoa.account_category, 'Other / Unclassified') as category,
          COUNT(*) as line_count,
          ROUND(SUM(sil.total_ht), 2) as total_ht,
          ROUND(SUM(sil.total_ttc), 2) as total_ttc
        FROM fin_supplier_invoice_lines sil
        JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
        LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = sil.fk_product
        LEFT JOIN fin_chart_of_accounts pcoa ON pcoa.account_code = pm.coa_account_code
        LEFT JOIN fin_supplier_coa_default sd ON sd.supplier_dolibarr_id = si.socid
        LEFT JOIN fin_chart_of_accounts scoa ON scoa.account_code = sd.coa_account_code
        WHERE ${summaryConditions.join(' AND ')}
        GROUP BY category
        ORDER BY total_ht DESC
      `, ...summaryParams);
    }

    return NextResponse.json({
      lines: (lines as Record<string, unknown>[]).map((l) => ({
        productRef: l.product_ref,
        productLabel: l.product_label,
        accountingCode: l.accounting_code,
        costCategory: l.cost_category,
        invoiceRef: l.invoice_ref,
        dateInvoice: l.date_invoice,
        supplierName: l.supplier_name,
        projectRef: l.project_ref,
        qty: Number(l.qty ?? 0),
        unitPrice: Number(l.unit_price_ht ?? 0),
        totalHT: Number(l.total_ht ?? 0),
        totalVAT: Number(l.total_tva ?? 0),
        totalTTC: Number(l.total_ttc ?? 0),
        vatRate: Number(l.vat_rate ?? 0),
      })),
      categorySummary: (categorySummary as Record<string, unknown>[]).map((c) => ({
        category: c.category,
        lineCount: Number(c.line_count),
        totalHT: Number(c.total_ht),
        totalTTC: Number(c.total_ttc),
      })),
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch cost details');
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
