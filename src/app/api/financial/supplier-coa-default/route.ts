import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS fin_supplier_coa_default (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_dolibarr_id INT NOT NULL,
      coa_account_code VARCHAR(20) NOT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NULL,
      UNIQUE KEY uk_supplier_coa (supplier_dolibarr_id),
      INDEX idx_coa_account (coa_account_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function GET(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const mapped = searchParams.get('mapped') || 'all';
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
  const offset = page * limit;

  try {
    await ensureTable();

    const searchFilter = search ? `AND dt.name LIKE ?` : '';
    const mappedFilter =
      mapped === 'yes' ? 'AND sd.id IS NOT NULL' :
      mapped === 'no'  ? 'AND sd.id IS NULL' : '';
    const searchArgs = search ? [`%${search}%`] : [];

    // Derive suppliers from invoice data (source of truth for who has actually billed)
    const suppliersRaw: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        s.socid AS dolibarr_id,
        COALESCE(dt.name, CONCAT('Supplier #', s.socid)) AS name,
        sd.id AS mapping_id,
        sd.coa_account_code,
        sd.notes AS mapping_notes,
        coa.account_name AS coa_account_name,
        coa.account_name_ar AS coa_account_name_ar,
        coa.account_category AS coa_account_category,
        CASE WHEN sd.id IS NOT NULL THEN 1 ELSE 0 END AS is_mapped,
        s.invoice_count,
        s.total_ht AS total_spend_ht,
        COALESCE(unmapped.cnt, 0) AS unmapped_product_count
      FROM (
        SELECT socid, COUNT(DISTINCT dolibarr_id) AS invoice_count, SUM(total_ht) AS total_ht
        FROM fin_supplier_invoices
        WHERE is_active = 1 AND status >= 1
        GROUP BY socid
      ) s
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = s.socid
      LEFT JOIN fin_supplier_coa_default sd ON sd.supplier_dolibarr_id = s.socid
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = sd.coa_account_code
      LEFT JOIN (
        SELECT si.socid, COUNT(DISTINCT sil.fk_product) AS cnt
        FROM fin_supplier_invoice_lines sil
        INNER JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id AND si.is_active = 1
        WHERE sil.fk_product IS NOT NULL AND sil.fk_product > 0
          AND sil.fk_product NOT IN (SELECT dolibarr_product_id FROM fin_product_coa_mapping)
        GROUP BY si.socid
      ) unmapped ON unmapped.socid = s.socid
      WHERE 1=1 ${searchFilter} ${mappedFilter}
      ORDER BY s.total_ht DESC
      LIMIT ? OFFSET ?
    `, ...searchArgs, limit, offset);

    const suppliers = suppliersRaw.map((row: any) => ({
      ...row,
      dolibarr_id: Number(row.dolibarr_id),
      mapping_id: row.mapping_id ? Number(row.mapping_id) : null,
      is_mapped: Number(row.is_mapped),
      invoice_count: Number(row.invoice_count),
      total_spend_ht: Number(row.total_spend_ht),
      unmapped_product_count: Number(row.unmapped_product_count),
    }));

    const countRows: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT socid FROM fin_supplier_invoices WHERE is_active = 1 AND status >= 1 GROUP BY socid
      ) s
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = s.socid
      LEFT JOIN fin_supplier_coa_default sd ON sd.supplier_dolibarr_id = s.socid
      WHERE 1=1 ${searchFilter} ${mappedFilter}
    `, ...searchArgs);

    const statsRows: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) AS total_suppliers,
        SUM(CASE WHEN sd.id IS NOT NULL THEN 1 ELSE 0 END) AS mapped_suppliers,
        SUM(CASE WHEN sd.id IS NOT NULL THEN s.total_ht ELSE 0 END) AS mapped_spend_ht,
        SUM(CASE WHEN sd.id IS NULL THEN s.total_ht ELSE 0 END) AS unmapped_spend_ht
      FROM (
        SELECT socid, SUM(total_ht) AS total_ht
        FROM fin_supplier_invoices WHERE is_active = 1 AND status >= 1 GROUP BY socid
      ) s
      LEFT JOIN fin_supplier_coa_default sd ON sd.supplier_dolibarr_id = s.socid
    `);

    const sv = (statsRows as Record<string, unknown>[])[0];
    const total = Number((countRows as Record<string, unknown>[])[0]?.cnt ?? 0);
    const totalS = Number(sv?.total_suppliers ?? 0);
    const mappedS = Number(sv?.mapped_suppliers ?? 0);
    const mappedSpend = Number(sv?.mapped_spend_ht ?? 0);
    const unmappedSpend = Number(sv?.unmapped_spend_ht ?? 0);
    const totalSpend = mappedSpend + unmappedSpend;

    return NextResponse.json({
      suppliers,
      pagination: { page, limit, total },
      stats: {
        totalSuppliers: totalS,
        mappedSuppliers: mappedS,
        unmappedSuppliers: totalS - mappedS,
        mappedSpendHT: mappedSpend,
        unmappedSpendHT: unmappedSpend,
        coveragePercent: totalSpend > 0 ? (mappedSpend / totalSpend) * 100 : 0,
      },
    });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch supplier COA defaults');
    return NextResponse.json({ error: 'Failed to fetch supplier COA defaults' }, { status: 500 });
  }
}

const upsertSchema = z.object({
  supplier_dolibarr_id: z.number().int().positive(),
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

  const { supplier_dolibarr_id, coa_account_code, notes } = parsed.data;

  try {
    await ensureTable();
    await prisma.$executeRawUnsafe(`
      INSERT INTO fin_supplier_coa_default (supplier_dolibarr_id, coa_account_code, notes, created_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        coa_account_code = VALUES(coa_account_code),
        notes = VALUES(notes),
        updated_at = NOW()
    `, supplier_dolibarr_id, coa_account_code, notes ?? null, auth.session.sub ?? null);

    logger.info({ supplier_dolibarr_id, coa_account_code }, 'Supplier COA default upserted');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to upsert supplier COA default');
    return NextResponse.json({ error: 'Failed to save supplier mapping' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const supplierId = parseInt(searchParams.get('supplier_id') || '', 10);
  if (isNaN(supplierId)) return NextResponse.json({ error: 'supplier_id required' }, { status: 400 });

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM fin_supplier_coa_default WHERE supplier_dolibarr_id = ?`, supplierId,
    );
    logger.info({ supplierId }, 'Supplier COA default deleted');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to delete supplier COA default');
    return NextResponse.json({ error: 'Failed to delete supplier mapping' }, { status: 500 });
  }
}
