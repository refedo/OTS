import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'customer';
  const status = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    const table = type === 'supplier' ? 'fin_supplier_invoices' : 'fin_customer_invoices';
    const refField = type === 'supplier' ? 'ref_supplier' : 'ref_client';

    let where = 'WHERE inv.is_active = 1';
    const params: any[] = [];

    if (status === 'unpaid') { where += ' AND inv.is_paid = 0 AND inv.status >= 1'; }
    else if (status === 'paid') { where += ' AND inv.is_paid = 1'; }
    else if (status === 'draft') { where += ' AND inv.status = 0'; }
    else { where += ' AND inv.status >= 1'; }

    const countRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as cnt FROM ${table} inv ${where}`, ...params
    );
    const total = Number(countRows[0]?.cnt || 0);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT inv.*, COALESCE(dt.name, '') as thirdparty_name,
              COALESCE((SELECT SUM(fp.amount) FROM fin_payments fp
                        WHERE fp.invoice_dolibarr_id = inv.dolibarr_id
                          AND fp.payment_type = ?), 0) as amount_paid
       FROM ${table} inv
       LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = inv.socid
       ${where}
       ORDER BY inv.date_invoice DESC
       LIMIT ? OFFSET ?`,
      type === 'supplier' ? 'supplier' : 'customer', ...params, limit, offset
    );

    return NextResponse.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
