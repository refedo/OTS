import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/financial/product-coa-mapping/sync-labels
 *
 * Updates product_ref and product_label in supplier (and customer) invoice lines
 * to match the current values in dolibarr_products, without touching any COA
 * mappings or vendor relationships.
 */
export async function POST() {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  try {
    const supplierResult: { affectedRows?: number }[] = await prisma.$queryRawUnsafe(`
      UPDATE fin_supplier_invoice_lines sil
      INNER JOIN dolibarr_products dp ON dp.dolibarr_id = sil.fk_product
      SET sil.product_ref   = dp.ref,
          sil.product_label = dp.label
      WHERE sil.fk_product IS NOT NULL
        AND sil.fk_product > 0
        AND (sil.product_ref != dp.ref OR sil.product_label != dp.label
             OR sil.product_ref IS NULL OR sil.product_label IS NULL)
    `);

    const customerResult: { affectedRows?: number }[] = await prisma.$queryRawUnsafe(`
      UPDATE fin_customer_invoice_lines cil
      INNER JOIN dolibarr_products dp ON dp.dolibarr_id = cil.fk_product
      SET cil.product_ref   = dp.ref,
          cil.product_label = dp.label
      WHERE cil.fk_product IS NOT NULL
        AND cil.fk_product > 0
        AND (cil.product_ref != dp.ref OR cil.product_label != dp.label
             OR cil.product_ref IS NULL OR cil.product_label IS NULL)
    `);

    const supplierUpdated = Number((supplierResult as unknown as { affectedRows: number })?.affectedRows ?? 0);
    const customerUpdated = Number((customerResult as unknown as { affectedRows: number })?.affectedRows ?? 0);
    const total = supplierUpdated + customerUpdated;

    logger.info({ supplierUpdated, customerUpdated }, 'Product labels synced in invoice lines');

    return NextResponse.json({
      success: true,
      supplierLinesUpdated: supplierUpdated,
      customerLinesUpdated: customerUpdated,
      totalUpdated: total,
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to sync product labels');
    return NextResponse.json({ error: 'Failed to sync product labels' }, { status: 500 });
  }
}
