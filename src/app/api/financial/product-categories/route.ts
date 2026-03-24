import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional().nullable(),
  cost_classification: z.string().min(1).max(100),
  coa_account_code: z.string().max(20).optional().nullable(),
  description: z.string().optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const categories: unknown[] = await prisma.$queryRawUnsafe(`
      SELECT
        pc.*,
        coa.account_name as coa_account_name,
        (SELECT COUNT(*) FROM fin_product_category_mapping pcm WHERE pcm.category_id = pc.id) as mapped_products
      FROM fin_product_categories pc
      LEFT JOIN fin_chart_of_accounts coa ON coa.account_code = pc.coa_account_code
      ORDER BY pc.name ASC
    `);

    return NextResponse.json({ categories });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to fetch product categories');
    return NextResponse.json({ error: 'Failed to fetch product categories' }, { status: 500 });
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

  const { name, name_ar, cost_classification, coa_account_code, description, color } = parsed.data;

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO fin_product_categories (name, name_ar, cost_classification, coa_account_code, description, color, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      name, name_ar ?? null, cost_classification, coa_account_code ?? null,
      description ?? null, color ?? null, auth.userId ?? null,
    );

    const rows: unknown[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM fin_product_categories WHERE name = ? LIMIT 1`, name,
    );

    logger.info({ name, cost_classification }, 'Product category created');
    return NextResponse.json({ category: (rows as Record<string, unknown>[])[0] }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.includes('Duplicate') || msg.includes('uk_product_category_name')) {
      return NextResponse.json({ error: `Category "${name}" already exists` }, { status: 409 });
    }
    logger.error({ error }, 'Failed to create product category');
    return NextResponse.json({ error: 'Failed to create product category' }, { status: 500 });
  }
}
