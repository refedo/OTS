import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  try {
    const mappings: any[] = await prisma.$queryRawUnsafe(`
      SELECT dam.*,
        (SELECT COUNT(*) FROM fin_supplier_invoice_lines sil WHERE sil.accounting_code = dam.dolibarr_account_id) as line_count,
        (SELECT ROUND(SUM(sil.total_ht), 2) FROM fin_supplier_invoice_lines sil 
         JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
         WHERE sil.accounting_code = dam.dolibarr_account_id AND si.is_active = 1) as total_ht
      FROM fin_dolibarr_account_mapping dam
      ORDER BY total_ht DESC
    `);

    // Get distinct categories for dropdown
    const categories: any[] = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT ots_cost_category FROM fin_dolibarr_account_mapping ORDER BY ots_cost_category
    `);

    return NextResponse.json({
      mappings,
      categories: categories.map((c: any) => c.ots_cost_category),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  try {
    const body = await req.json();
    const { id, ots_cost_category, dolibarr_account_label, notes } = body;

    if (!id || !ots_cost_category) {
      return NextResponse.json({ error: 'id and ots_cost_category are required' }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE fin_dolibarr_account_mapping SET ots_cost_category = ?, dolibarr_account_label = ?, notes = ?, updated_at = NOW() WHERE id = ?`,
      ots_cost_category, dolibarr_account_label || null, notes || null, id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
