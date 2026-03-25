import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS fin_product_coa_mapping (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dolibarr_product_id INT NOT NULL,
      coa_account_code VARCHAR(20) NOT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NULL,
      UNIQUE KEY uk_product_coa (dolibarr_product_id),
      INDEX idx_coa_account (coa_account_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function GET(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const mapped = searchParams.get('mapped') || 'all'; // 'yes' | 'no' | 'all'
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = page * limit;

  try {
    await ensureTable();

    const searchFilter = search ? `AND (p.product_ref LIKE ? OR p.product_label LIKE ?)` : '';
    const mappedFilter =
      mapped === 'yes' ? 'AND pm.id IS NOT NULL' :
      mapped === 'no'  ? 'AND pm.id IS NULL' : '';
    const searchArgs = search ? [`%${search}%`, `%${search}%`] : [];

    // Derive distinct products from invoice lines (source of truth for what exists in invoices)
    const productsRaw: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        p.fk_product AS dolibarr_id,
        p.product_ref AS ref,
        p.product_label AS label,
        pm.id AS mapping_id,
        pm.coa_account_code,
        pm.notes AS mapping_notes,
        coa.account_name AS coa_account_name,
        coa.account_name_ar AS coa_account_name_ar,
        coa.account_category AS coa_account_category,
        CASE WHEN pm.id IS NOT NULL THEN 1 ELSE 0 END AS is_mapped,
        p.line_count AS invoice_line_count,
        p.total_ht AS total_spend_ht
      FROM (
        SELECT
          sil.fk_product,
          sil.product_ref,
          MAX(sil.product_label) AS product_label,
          COUNT(*) AS line_count,
          SUM(sil.total_ht) AS total_ht
        FROM fin_supplier_invoice_lines sil
        INNER JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id AND si.is_active = 1
        WHERE sil.fk_product IS NOT NULL AND sil.fk_product > 0
        GROUP BY sil.fk_product, sil.product_ref
      ) p
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = p.fk_product
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = pm.coa_account_code
      WHERE 1=1 ${searchFilter} ${mappedFilter}
      ORDER BY p.total_ht DESC, p.product_ref ASC
      LIMIT ? OFFSET ?
    `, ...searchArgs, limit, offset);

    const products = productsRaw.map((row: any) => ({
      ...row,
      dolibarr_id: Number(row.dolibarr_id),
      mapping_id: row.mapping_id ? Number(row.mapping_id) : null,
      is_mapped: Number(row.is_mapped),
      invoice_line_count: Number(row.invoice_line_count),
      total_spend_ht: Number(row.total_spend_ht),
    }));

    const countRows: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT sil.fk_product, sil.product_ref
        FROM fin_supplier_invoice_lines sil
        INNER JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id AND si.is_active = 1
        WHERE sil.fk_product IS NOT NULL AND sil.fk_product > 0
        GROUP BY sil.fk_product, sil.product_ref
      ) p
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = p.fk_product
      WHERE 1=1 ${searchFilter} ${mappedFilter}
    `, ...searchArgs);

    const statsRows: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS total_products,
        SUM(CASE WHEN pm.id IS NOT NULL THEN 1 ELSE 0 END) AS mapped_products,
        SUM(CASE WHEN pm.id IS NOT NULL THEN p.total_ht ELSE 0 END) AS mapped_spend_ht,
        SUM(CASE WHEN pm.id IS NULL THEN p.total_ht ELSE 0 END) AS unmapped_spend_ht
      FROM (
        SELECT sil.fk_product, sil.product_ref, SUM(sil.total_ht) AS total_ht
        FROM fin_supplier_invoice_lines sil
        INNER JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id AND si.is_active = 1
        WHERE sil.fk_product IS NOT NULL AND sil.fk_product > 0
        GROUP BY sil.fk_product, sil.product_ref
      ) p
      LEFT JOIN fin_product_coa_mapping pm ON pm.dolibarr_product_id = p.fk_product
    `);

    const s = (statsRows as Record<string, unknown>[])[0];
    const total = Number((countRows as Record<string, unknown>[])[0]?.cnt ?? 0);
    const totalP = Number(s?.total_products ?? 0);
    const mappedP = Number(s?.mapped_products ?? 0);
    const mappedSpend = Number(s?.mapped_spend_ht ?? 0);
    const unmappedSpend = Number(s?.unmapped_spend_ht ?? 0);
    const totalSpend = mappedSpend + unmappedSpend;

    return NextResponse.json({
      products,
      pagination: { page, limit, total },
      stats: {
        totalProducts: totalP,
        mappedProducts: mappedP,
        unmappedProducts: totalP - mappedP,
        mappedSpendHT: mappedSpend,
        unmappedSpendHT: unmappedSpend,
        coveragePercent: totalSpend > 0 ? (mappedSpend / totalSpend) * 100 : 0,
      },
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch product COA mappings');
    return NextResponse.json({ error: 'Failed to fetch product COA mappings' }, { status: 500 });
  }
}

const upsertSchema = z.object({
  dolibarr_product_id: z.number().int().positive(),
  coa_account_code: z.string().min(1).max(20),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { dolibarr_product_id, coa_account_code, notes } = parsed.data;

  try {
    await ensureTable();
    await prisma.$executeRawUnsafe(`
      INSERT INTO fin_product_coa_mapping (dolibarr_product_id, coa_account_code, notes)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        coa_account_code = VALUES(coa_account_code),
        notes = VALUES(notes),
        updated_at = NOW()
    `, dolibarr_product_id, coa_account_code, notes ?? null);

    logger.info({ dolibarr_product_id, coa_account_code }, 'Product COA mapping upserted');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to upsert product COA mapping');
    return NextResponse.json({ error: 'Failed to save mapping' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const productId = parseInt(searchParams.get('product_id') || '', 10);
  if (isNaN(productId)) return NextResponse.json({ error: 'product_id required' }, { status: 400 });

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM fin_product_coa_mapping WHERE dolibarr_product_id = ?`, productId,
    );
    logger.info({ productId }, 'Product COA mapping deleted');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to delete product COA mapping');
    return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 });
  }
}
