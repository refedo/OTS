import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const exportFormat = searchParams.get('export');
  const category = searchParams.get('category') || '';

  const fromDate = from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const toDate = to || new Date().toISOString().slice(0, 10);

  try {
    const categoryFilter = category ? `AND COALESCE(coa.account_category, 'Other / Unclassified') = ?` : '';
    const queryParams: (string | number)[] = category
      ? [fromDate, toDate, category]
      : [fromDate, toDate];

    const rows: {
      product_ref: string;
      product_label: string | null;
      coa_code: string | null;
      coa_label: string | null;
      coa_category: string | null;
      total_qty: number;
      total_amount: number;
    }[] = await prisma.$queryRawUnsafe(`
      SELECT
        sil.product_ref,
        MIN(sil.product_label)                                          AS product_label,
        COALESCE(pm.coa_account_code, '')                               AS coa_code,
        COALESCE(coa.account_name, 'Other / Unclassified')             AS coa_label,
        COALESCE(coa.account_category, 'Other / Unclassified')         AS coa_category,
        SUM(sil.qty)                                                    AS total_qty,
        SUM(sil.total_ht)                                               AS total_amount
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = sil.fk_product
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = pm.coa_account_code
      WHERE si.is_active = 1
        AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
        AND sil.product_ref IS NOT NULL
        AND sil.product_ref != ''
        ${categoryFilter}
      GROUP BY sil.product_ref, pm.coa_account_code, coa.account_name, coa.account_category
      ORDER BY SUM(sil.total_ht) DESC
    `, ...queryParams);

    // Fetch available categories for filter dropdown (unfiltered)
    const categoryRows: { coa_category: string }[] = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT
        COALESCE(coa.account_category, 'Other / Unclassified') AS coa_category
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = sil.fk_product
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = pm.coa_account_code
      WHERE si.is_active = 1
        AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
        AND sil.product_ref IS NOT NULL
        AND sil.product_ref != ''
      ORDER BY coa_category
    `, fromDate, toDate);

    const products = rows.map((r) => ({
      productRef: r.product_ref,
      productLabel: r.product_label || r.product_ref,
      coaCode: r.coa_code || '—',
      coaLabel: r.coa_label || 'Other / Unclassified',
      coaCategory: r.coa_category || 'Other / Unclassified',
      totalQty: Number(r.total_qty),
      totalAmount: Number(r.total_amount),
    }));

    const totalAmount = products.reduce((s, p) => s + p.totalAmount, 0);
    const totalQty = products.reduce((s, p) => s + p.totalQty, 0);
    const categories = categoryRows.map((c) => c.coa_category).filter(Boolean);

    if (exportFormat === 'excel') {
      let csv = '﻿';
      csv += `Procurement by Product,${fromDate} to ${toDate}\n`;
      csv += 'Product Ref,Product Description,COA Code,COA Account Name,COA Category,Total Qty,Total Amount (SAR)\n';
      for (const p of products) {
        csv += [
          `"${p.productRef}"`,
          `"${p.productLabel}"`,
          `"${p.coaCode}"`,
          `"${p.coaLabel}"`,
          `"${p.coaCategory}"`,
          p.totalQty.toFixed(4),
          p.totalAmount.toFixed(2),
        ].join(',') + '\n';
      }
      csv += `,,,,,${totalQty.toFixed(4)},${totalAmount.toFixed(2)}\n`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="procurement-by-product-${fromDate}-to-${toDate}.csv"`,
        },
      });
    }

    return NextResponse.json({
      from: fromDate,
      to: toDate,
      products,
      categories,
      summary: {
        productCount: products.length,
        totalAmount,
        totalQty,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
