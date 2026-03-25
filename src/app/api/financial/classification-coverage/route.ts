import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const rows: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS total_lines,
        COALESCE(SUM(sil.total_ht), 0) AS total_spend_ht,

        SUM(CASE WHEN pm.id IS NOT NULL THEN 1 ELSE 0 END) AS product_mapped_lines,
        COALESCE(SUM(CASE WHEN pm.id IS NOT NULL THEN sil.total_ht ELSE 0 END), 0) AS product_mapped_ht,

        SUM(CASE WHEN pm.id IS NULL AND sd.id IS NOT NULL THEN 1 ELSE 0 END) AS supplier_mapped_lines,
        COALESCE(SUM(CASE WHEN pm.id IS NULL AND sd.id IS NOT NULL THEN sil.total_ht ELSE 0 END), 0) AS supplier_mapped_ht,

        SUM(CASE WHEN pm.id IS NULL AND sd.id IS NULL THEN 1 ELSE 0 END) AS unmapped_lines,
        COALESCE(SUM(CASE WHEN pm.id IS NULL AND sd.id IS NULL THEN sil.total_ht ELSE 0 END), 0) AS unmapped_ht
      FROM fin_supplier_invoice_lines sil
      INNER JOIN fin_supplier_invoices si
        ON si.dolibarr_id = sil.invoice_dolibarr_id AND si.is_active = 1 AND si.status > 0
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = sil.fk_product
      LEFT JOIN fin_supplier_coa_default sd ON sd.supplier_dolibarr_id = si.socid
    `);

    const r = (rows as Record<string, unknown>[])[0] ?? {};
    const totalLines = Number(r.total_lines ?? 0);
    const totalHT = Number(r.total_spend_ht ?? 0);
    const productMappedLines = Number(r.product_mapped_lines ?? 0);
    const productMappedHT = Number(r.product_mapped_ht ?? 0);
    const supplierMappedLines = Number(r.supplier_mapped_lines ?? 0);
    const supplierMappedHT = Number(r.supplier_mapped_ht ?? 0);
    const unmappedLines = Number(r.unmapped_lines ?? 0);
    const unmappedHT = Number(r.unmapped_ht ?? 0);
    const classifiedHT = productMappedHT + supplierMappedHT;

    // Product mapping counts
    const productCounts: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS total_active,
        (SELECT COUNT(*) FROM fin_product_coa_mapping) AS mapped_count
      FROM dolibarr_products WHERE is_active = 1
    `);
    const pc = (productCounts as Record<string, unknown>[])[0] ?? {};

    // Supplier mapping counts
    const supplierCounts: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS total_active,
        (SELECT COUNT(*) FROM fin_supplier_coa_default) AS mapped_count
      FROM dolibarr_thirdparties WHERE supplier_type = 1 AND is_active = 1
    `);
    const sc = (supplierCounts as Record<string, unknown>[])[0] ?? {};

    return NextResponse.json({
      lines: {
        total: totalLines,
        productMapped: productMappedLines,
        supplierMapped: supplierMappedLines,
        unmapped: unmappedLines,
      },
      spend: {
        totalHT,
        productMappedHT,
        supplierMappedHT,
        classifiedHT,
        unmappedHT,
        coveragePercent: totalHT > 0 ? (classifiedHT / totalHT) * 100 : 0,
      },
      products: {
        total: Number(pc.total_active ?? 0),
        mapped: Number(pc.mapped_count ?? 0),
      },
      suppliers: {
        total: Number(sc.total_active ?? 0),
        mapped: Number(sc.mapped_count ?? 0),
      },
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch classification coverage');
    return NextResponse.json({ error: 'Failed to fetch coverage stats' }, { status: 500 });
  }
}
