import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  name_ar: z.string().max(100).optional().nullable(),
  cost_classification: z.string().min(1).max(100).optional(),
  coa_account_code: z.string().max(20).optional().nullable(),
  description: z.string().optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, name_ar, cost_classification, coa_account_code, description, color, is_active } = parsed.data;

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE fin_product_categories SET
        name = COALESCE(?, name),
        name_ar = ?,
        cost_classification = COALESCE(?, cost_classification),
        coa_account_code = ?,
        description = ?,
        color = ?,
        is_active = COALESCE(?, is_active),
        updated_by = ?,
        updated_at = NOW()
       WHERE id = ?`,
      name ?? null, name_ar ?? null, cost_classification ?? null,
      coa_account_code ?? null, description ?? null, color ?? null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      auth.userId ?? null, numId,
    );

    logger.info({ id: numId }, 'Product category updated');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to update product category');
    return NextResponse.json({ error: 'Failed to update product category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const mappings: unknown[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM fin_product_category_mapping WHERE category_id = ?`, numId,
    );
    const cnt = Number((mappings as Record<string, unknown>[])[0]?.cnt ?? 0);
    if (cnt > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${cnt} product mapping(s) use this category. Remove them first.` },
        { status: 409 },
      );
    }

    await prisma.$executeRawUnsafe(`DELETE FROM fin_product_categories WHERE id = ?`, numId);
    logger.info({ id: numId }, 'Product category deleted');
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to delete product category');
    return NextResponse.json({ error: 'Failed to delete product category' }, { status: 500 });
  }
}
