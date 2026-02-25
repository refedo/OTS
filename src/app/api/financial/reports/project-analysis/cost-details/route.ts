import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const category = searchParams.get('category');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // Allow aggregate queries without projectId
  if (!projectId && !category) {
    return NextResponse.json({ error: 'Either projectId or category is required' }, { status: 400 });
  }

  try {
    let where = 'si.is_active = 1 AND si.status >= 1';
    const params: any[] = [];

    // Add project filter if specified
    if (projectId) {
      where += ' AND si.fk_projet = ?';
      params.push(parseInt(projectId));
    }

    // Add date filters if specified
    if (from) {
      where += ' AND si.date_invoice >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND si.date_invoice <= ?';
      params.push(to);
    }

    // If category is specified, filter by it
    let categoryFilter = '';
    if (category) {
      if (category === 'Other / Unclassified' || category === 'Unmapped') {
        categoryFilter = `AND (dam.ots_cost_category IS NULL OR dam.ots_cost_category = ?)`;
        params.push(category);
      } else {
        categoryFilter = `AND dam.ots_cost_category = ?`;
        params.push(category);
      }
    }

    const lines: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        sil.product_ref,
        sil.product_label,
        sil.accounting_code,
        COALESCE(dam.ots_cost_category, 'Other / Unclassified') as cost_category,
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
      LEFT JOIN fin_dolibarr_account_mapping dam ON dam.dolibarr_account_id = sil.accounting_code
      WHERE ${where} ${categoryFilter}
      ORDER BY sil.total_ht DESC
      LIMIT 500
    `, ...params);

    // Get category summary (only if projectId is specified)
    let categorySummary: any[] = [];
    if (projectId) {
      categorySummary = await prisma.$queryRawUnsafe(`
        SELECT
          COALESCE(dam.ots_cost_category, 'Other / Unclassified') as category,
          COUNT(*) as line_count,
          ROUND(SUM(sil.total_ht), 2) as total_ht,
          ROUND(SUM(sil.total_ttc), 2) as total_ttc
        FROM fin_supplier_invoice_lines sil
        JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
        LEFT JOIN fin_dolibarr_account_mapping dam ON dam.dolibarr_account_id = sil.accounting_code
        WHERE si.is_active = 1 AND si.status >= 1 AND si.fk_projet = ?
        GROUP BY category
        ORDER BY total_ht DESC
      `, parseInt(projectId));
    }

    return NextResponse.json({
      lines: lines.map((l: any) => ({
        productRef: l.product_ref,
        productLabel: l.product_label,
        accountingCode: l.accounting_code,
        costCategory: l.cost_category,
        invoiceRef: l.invoice_ref,
        dateInvoice: l.date_invoice,
        supplierName: l.supplier_name,
        projectRef: l.project_ref,
        qty: Number(l.qty || 0),
        unitPrice: Number(l.unit_price_ht || 0),
        totalHT: Number(l.total_ht || 0),
        totalVAT: Number(l.total_tva || 0),
        totalTTC: Number(l.total_ttc || 0),
        vatRate: Number(l.vat_rate || 0),
      })),
      categorySummary: categorySummary.map((c: any) => ({
        category: c.category,
        lineCount: Number(c.line_count),
        totalHT: Number(c.total_ht),
        totalTTC: Number(c.total_ttc),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
