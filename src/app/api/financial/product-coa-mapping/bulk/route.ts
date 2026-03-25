import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const bulkSchema = z.object({
  dolibarr_product_ids: z.array(z.number().int().positive()).min(1).max(500),
  coa_account_code: z.string().min(1).max(20),
  notes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const body = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const { dolibarr_product_ids, coa_account_code, notes } = parsed.data;

  try {
    let upserted = 0;
    for (const productId of dolibarr_product_ids) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO fin_product_coa_mapping (dolibarr_product_id, coa_account_code, notes, created_by)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          coa_account_code = VALUES(coa_account_code),
          notes = VALUES(notes),
          updated_at = NOW()
      `, productId, coa_account_code, notes ?? null, auth.userId ?? null);
      upserted++;
    }

    logger.info({ count: upserted, coa_account_code }, 'Bulk product COA mapping upserted');
    return NextResponse.json({ success: true, upserted });
  } catch (error: unknown) {
    logger.error({ error }, 'Failed to bulk upsert product COA mappings');
    return NextResponse.json({ error: 'Failed to bulk save mappings' }, { status: 500 });
  }
}
