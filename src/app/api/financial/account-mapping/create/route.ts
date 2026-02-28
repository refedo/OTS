import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

/**
 * Create a new Dolibarr account mapping
 */
export async function POST(req: Request) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const { dolibarr_account_id, ots_cost_category, dolibarr_account_label, notes } = body;

    if (!dolibarr_account_id || !ots_cost_category) {
      return NextResponse.json(
        { error: 'dolibarr_account_id and ots_cost_category are required' },
        { status: 400 }
      );
    }

    // Check if mapping already exists
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM fin_dolibarr_account_mapping WHERE dolibarr_account_id = ?`,
      dolibarr_account_id
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Mapping already exists for this Dolibarr account ID' },
        { status: 400 }
      );
    }

    // Create new mapping
    await prisma.$executeRawUnsafe(
      `INSERT INTO fin_dolibarr_account_mapping 
       (dolibarr_account_id, ots_cost_category, dolibarr_account_label, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      dolibarr_account_id,
      ots_cost_category,
      dolibarr_account_label || null,
      notes || null
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Create Mapping] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
