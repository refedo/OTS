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

  const fromDate = from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const toDate = to || new Date().toISOString().slice(0, 10);

  try {
    const rows: {
      product_ref: string;
      product_label: string | null;
      coa_code: string | null;
      coa_label: string | null;
      total_qty: number;
      total_amount: number;
    }[] = await prisma.$queryRawUnsafe(`
      SELECT
        sil.product_ref,
        MIN(sil.product_label)                                                       AS product_label,
        COALESCE(dam.dolibarr_account_code, sil.accounting_code, '')                 AS coa_code,
        COALESCE(dam.dolibarr_account_label, dam.ots_cost_category, sil.accounting_code, 'Unknown Account') AS coa_label,
        SUM(sil.qty)                                                                 AS total_qty,
        SUM(sil.total_ht)                                                            AS total_amount
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      LEFT JOIN fin_dolibarr_account_mapping dam ON dam.dolibarr_account_id = sil.accounting_code
      WHERE si.is_active = 1
        AND si.status >= 1
        AND si.date_invoice BETWEEN ? AND ?
        AND sil.product_ref IS NOT NULL
        AND sil.product_ref != ''
      GROUP BY sil.product_ref, sil.accounting_code, dam.dolibarr_account_code, dam.dolibarr_account_label, dam.ots_cost_category
      ORDER BY SUM(sil.total_ht) DESC
    `, fromDate, toDate);

    const products = rows.map((r) => ({
      productRef: r.product_ref,
      productLabel: r.product_label || r.product_ref,
      coaCode: r.coa_code || '—',
      coaLabel: r.coa_label || 'Unknown Account',
      totalQty: Number(r.total_qty),
      totalAmount: Number(r.total_amount),
    }));

    const totalAmount = products.reduce((s, p) => s + p.totalAmount, 0);
    const totalQty = products.reduce((s, p) => s + p.totalQty, 0);

    if (exportFormat === 'excel') {
      let csv = '﻿';
      csv += `Procurement by Product,${fromDate} to ${toDate}\n`;
      csv += 'Product Ref,Product Description,COA Code,COA Account Name,Total Qty,Total Amount (SAR)\n';
      for (const p of products) {
        csv += [
          `"${p.productRef}"`,
          `"${p.productLabel}"`,
          `"${p.coaCode}"`,
          `"${p.coaLabel}"`,
          p.totalQty.toFixed(4),
          p.totalAmount.toFixed(2),
        ].join(',') + '\n';
      }
      csv += `,,,,${totalQty.toFixed(4)},${totalAmount.toFixed(2)}\n`;

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
