import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

/**
 * Cash Flow Details API
 * Returns individual payments for a specific month and type (cash-in or cash-out)
 */
export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const month = searchParams.get('month');
  const type = searchParams.get('type'); // 'in' or 'out'

  if (!month || !type) {
    return NextResponse.json({ error: 'month and type are required' }, { status: 400 });
  }

  const monthNum = parseInt(month, 10);
  const monthStart = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  const monthEnd = monthNum === 12
    ? `${year}-12-31`
    : `${year}-${String(monthNum + 1).padStart(2, '0')}-01`;

  try {
    const paymentType = type === 'in' ? 'customer' : 'supplier';
    const invoiceTable = type === 'in' ? 'fin_customer_invoices' : 'fin_supplier_invoices';

    const payments: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        fp.id,
        fp.dolibarr_ref as payment_ref,
        fp.amount,
        fp.payment_date,
        fp.payment_method,
        inv.ref as invoice_ref,
        COALESCE(dt.name, CONCAT('Third Party #', inv.socid)) as thirdparty_name
      FROM fin_payments fp
      LEFT JOIN ${invoiceTable} inv ON inv.dolibarr_id = fp.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = inv.socid
      WHERE fp.payment_type = ?
        AND fp.payment_date >= ? AND fp.payment_date < ?
      ORDER BY fp.payment_date DESC, fp.amount DESC
    `, paymentType, monthStart, monthEnd);

    const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
      year,
      month: monthNum,
      type,
      payments: payments.map(p => ({
        id: p.id,
        paymentRef: p.payment_ref,
        invoiceRef: p.invoice_ref,
        thirdpartyName: p.thirdparty_name,
        amount: Number(p.amount),
        date: p.payment_date ? new Date(p.payment_date).toISOString().slice(0, 10) : '',
        method: p.payment_method,
      })),
      total,
      count: payments.length,
    });
  } catch (error: any) {
    console.error('[Cash Flow Details] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
