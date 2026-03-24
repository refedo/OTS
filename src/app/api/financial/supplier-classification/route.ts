import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  supplier_id: z.number().int().positive(),
  supplier_name: z.string().max(255).optional().nullable(),
  cost_category: z.string().min(1).max(100),
  coa_account_code: z.string().max(20).optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS fin_supplier_classification (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      supplier_name VARCHAR(255) NULL,
      cost_category VARCHAR(100) NOT NULL,
      coa_account_code VARCHAR(20) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_by INT NULL,
      updated_by INT NULL,
      UNIQUE KEY uk_supplier_id (supplier_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    await ensureTables();
    const classifications: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        sc.*,
        coa.account_name as coa_account_name,
        (
          SELECT COUNT(DISTINCT si.dolibarr_id)
          FROM fin_supplier_invoices si
          WHERE si.socid = sc.supplier_id AND si.is_active = 1
        ) as invoice_count,
        (
          SELECT ROUND(SUM(si.total_ht), 2)
          FROM fin_supplier_invoices si
          WHERE si.socid = sc.supplier_id AND si.is_active = 1
        ) as total_ht
      FROM fin_supplier_classification sc
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = sc.coa_account_code
      ORDER BY sc.supplier_name ASC
    `);

    // Suppliers that appear in invoices but are not yet classified
    const unclassified: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        si.socid as supplier_id,
        dt.name as supplier_name,
        COUNT(DISTINCT si.dolibarr_id) as invoice_count,
        ROUND(SUM(si.total_ht), 2) as total_ht
      FROM fin_supplier_invoices si
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
      WHERE si.is_active = 1
        AND si.socid NOT IN (SELECT supplier_id FROM fin_supplier_classification)
      GROUP BY si.socid, dt.name
      ORDER BY total_ht DESC
      LIMIT 200
    `);

    return NextResponse.json({ classifications, unclassified });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch supplier classifications');
    return NextResponse.json({ error: 'Failed to fetch supplier classifications' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { supplier_id, supplier_name, cost_category, coa_account_code, notes } = parsed.data;

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO fin_supplier_classification (supplier_id, supplier_name, cost_category, coa_account_code, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      supplier_id, supplier_name ?? null, cost_category, coa_account_code ?? null, notes ?? null, auth.userId ?? null,
    );

    logger.info({ supplier_id, cost_category }, 'Supplier classification created');
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('Duplicate') || msg.includes('uk_supplier_id')) {
      return NextResponse.json({ error: `Supplier ${supplier_id} is already classified` }, { status: 409 });
    }
    logger.error({ error }, 'Failed to create supplier classification');
    return NextResponse.json({ error: 'Failed to create supplier classification' }, { status: 500 });
  }
}
