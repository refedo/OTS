import { NextResponse } from 'next/server';
import { withApiContext } from '@/lib/api-utils';
import { z } from 'zod';
import { getSupplierCoaMapping } from '@/lib/services/supply-chain/supplier-portal.service';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const upsertSchema = z.object({
  ap_account_code:    z.string().min(1).max(20).optional().nullable(),
  cogs_account_code:  z.string().min(1).max(20).optional().nullable(),
  cost_category:      z.string().optional().nullable(),
  ap_notes:           z.string().optional().nullable(),
});

export const GET = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

  return NextResponse.json(await getSupplierCoaMapping(id));
});

export const POST = withApiContext(async (req, session, ctx) => {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(ctx?.params?.id ?? '', 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid supplier id' }, { status: 400 });

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });

  const { ap_account_code, cogs_account_code, cost_category, ap_notes } = parsed.data;

  try {
    if (ap_account_code) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO fin_supplier_coa_default (supplier_dolibarr_id, coa_account_code, notes)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE coa_account_code = VALUES(coa_account_code), notes = VALUES(notes), updated_at = NOW()
      `, id, ap_account_code, ap_notes ?? null);
    }

    if (cogs_account_code !== undefined || cost_category !== undefined) {
      // Check if classification row exists
      const existsRows = await prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
        `SELECT COUNT(*) AS cnt FROM fin_supplier_classification WHERE supplier_id = ?`, id,
      );
      const exists = Number(existsRows[0]?.cnt ?? 0) > 0;

      // Get supplier name for the row
      const nameRows = await prisma.$queryRawUnsafe<[{ name: string }]>(
        `SELECT name FROM dolibarr_thirdparties WHERE dolibarr_id = ?`, id,
      );
      const supplierName = nameRows[0]?.name ?? `Supplier #${id}`;

      if (exists) {
        const sets: string[] = [];
        const args: unknown[] = [];
        if (cogs_account_code !== undefined) { sets.push('coa_account_code = ?'); args.push(cogs_account_code ?? null); }
        if (cost_category !== undefined) { sets.push('cost_category = ?'); args.push(cost_category ?? null); }
        if (sets.length) {
          args.push(id);
          await prisma.$executeRawUnsafe(
            `UPDATE fin_supplier_classification SET ${sets.join(', ')} WHERE supplier_id = ?`,
            ...args,
          );
        }
      } else {
        await prisma.$executeRawUnsafe(`
          INSERT INTO fin_supplier_classification (supplier_id, supplier_name, cost_category, coa_account_code)
          VALUES (?, ?, ?, ?)
        `, id, supplierName, cost_category ?? null, cogs_account_code ?? null);
      }
    }

    logger.info({ supplierId: id }, 'Supplier COA mapping updated');
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error, supplierId: id }, 'Failed to update supplier COA mapping');
    return NextResponse.json({ error: 'Failed to update COA mapping' }, { status: 500 });
  }
});
