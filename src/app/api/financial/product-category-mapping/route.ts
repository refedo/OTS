import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  product_ref: z.string().min(1).max(100),
  product_label_hint: z.string().max(255).optional().nullable(),
  category_id: z.number().int().positive(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const mappings: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        pcm.*,
        pc.name as category_name,
        pc.name_ar as category_name_ar,
        pc.cost_classification,
        pc.coa_account_code,
        pc.color as category_color,
        (
          SELECT COUNT(*) FROM fin_supplier_invoice_lines sil
          WHERE sil.product_ref = pcm.product_ref
        ) as line_count,
        (
          SELECT ROUND(SUM(sil.total_ht), 2)
          FROM fin_supplier_invoice_lines sil
          JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
          WHERE sil.product_ref = pcm.product_ref AND si.is_active = 1
        ) as total_ht
      FROM fin_product_category_mapping pcm
      JOIN fin_product_categories pc ON pc.id = pcm.category_id
      ORDER BY pcm.product_ref ASC
    `);

    // Also return list of unmapped product refs that appear in invoices
    const unmapped: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        sil.product_ref,
        MIN(sil.product_label) as product_label,
        COUNT(*) as line_count,
        ROUND(SUM(sil.total_ht), 2) as total_ht
      FROM fin_supplier_invoice_lines sil
      JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
      WHERE si.is_active = 1
        AND sil.product_ref IS NOT NULL
        AND sil.product_ref != ''
        AND sil.product_ref NOT IN (
          SELECT product_ref FROM fin_product_category_mapping
        )
      GROUP BY sil.product_ref
      ORDER BY total_ht DESC
      LIMIT 200
    `);

    return NextResponse.json({ mappings, unmapped });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch product category mappings');
    return NextResponse.json({ error: 'Failed to fetch product category mappings' }, { status: 500 });
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

  const { product_ref, product_label_hint, category_id, notes } = parsed.data;

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO fin_product_category_mapping (product_ref, product_label_hint, category_id, notes, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      product_ref, product_label_hint ?? null, category_id, notes ?? null, auth.userId ?? null,
    );

    logger.info({ product_ref, category_id }, 'Product category mapping created');
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('Duplicate') || msg.includes('uk_product_ref')) {
      return NextResponse.json({ error: `Product ref "${product_ref}" is already mapped` }, { status: 409 });
    }
    logger.error({ error }, 'Failed to create product category mapping');
    return NextResponse.json({ error: 'Failed to create product category mapping' }, { status: 500 });
  }
}
