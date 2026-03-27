import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';
import { systemEventService } from '@/services/system-events.service';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  category_id: z.number().int().positive().optional(),
  product_label_hint: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
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

  const { category_id, product_label_hint, notes } = parsed.data;

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE fin_product_category_mapping SET
        category_id = COALESCE(?, category_id),
        product_label_hint = ?,
        notes = ?,
        updated_by = ?,
        updated_at = NOW()
       WHERE id = ?`,
      category_id ?? null, product_label_hint ?? null, notes ?? null, auth.userId ?? null, numId,
    );

    logger.info({ id: numId }, 'Product category mapping updated');

    systemEventService.log({
      eventType: 'FIN_PRODUCT_MAPPING_CHANGED',
      eventCategory: 'FINANCIAL',
      severity: 'INFO',
      userId: auth.session.sub,
      userName: auth.session.name,
      entityType: 'ProductCategoryMapping',
      entityId: id,
      summary: `Product mapping updated: ID ${numId}`,
      details: { id: numId, category_id },
    }).catch((err: unknown) => logger.error({ err }, '[product-category-mapping/id] Failed to log FIN_PRODUCT_MAPPING_CHANGED'));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to update product category mapping');
    return NextResponse.json({ error: 'Failed to update product category mapping' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM fin_product_category_mapping WHERE id = ?`, numId);
    logger.info({ id: numId }, 'Product category mapping deleted');

    systemEventService.log({
      eventType: 'FIN_PRODUCT_MAPPING_CHANGED',
      eventCategory: 'FINANCIAL',
      severity: 'INFO',
      userId: auth.session.sub,
      userName: auth.session.name,
      entityType: 'ProductCategoryMapping',
      entityId: id,
      summary: `Product mapping deleted: ID ${numId}`,
      details: { id: numId, action: 'deleted' },
    }).catch((err: unknown) => logger.error({ err }, '[product-category-mapping/id] Failed to log FIN_PRODUCT_MAPPING_CHANGED'));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to delete product category mapping');
    return NextResponse.json({ error: 'Failed to delete product category mapping' }, { status: 500 });
  }
}
