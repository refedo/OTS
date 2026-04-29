import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const type       = searchParams.get('type'); // 'customer' | 'supplier'
  const entityName = searchParams.get('entityName') || '';
  const now        = new Date();
  const year       = parseInt(searchParams.get('year')    || now.getFullYear().toString(), 10);
  const month      = parseInt(searchParams.get('month')   || (now.getMonth() + 1).toString(), 10);
  const toYear     = parseInt(searchParams.get('toYear')  || year.toString(), 10);
  const toMonth    = parseInt(searchParams.get('toMonth') || month.toString(), 10);

  if (type !== 'customer' && type !== 'supplier') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const monthEnd   = toMonth === 12
    ? `${toYear + 1}-01-01`
    : `${toYear}-${String(toMonth + 1).padStart(2, '0')}-01`;

  try {
    const invTable = type === 'customer' ? 'fin_customer_invoices' : 'fin_supplier_invoices';
    const refAlias = type === 'customer' ? 'inv.ref_client' : 'inv.ref_supplier';

    const rows: {
      invoice_ref: string;
      invoice_supplier_ref: string | null;
      invoice_date: string | null;
      invoice_amount: string;
      payment_ref: string;
      payment_date: string | null;
      payment_amount: string;
      payment_method: string | null;
    }[] = await prisma.$queryRawUnsafe(`
      SELECT
        inv.ref                                                   AS invoice_ref,
        ${refAlias}                                               AS invoice_supplier_ref,
        inv.date_invoice                                          AS invoice_date,
        inv.total_ttc                                             AS invoice_amount,
        fp.dolibarr_ref                                           AS payment_ref,
        fp.payment_date                                           AS payment_date,
        fp.amount                                                 AS payment_amount,
        fp.payment_method                                         AS payment_method
      FROM fin_payments fp
      JOIN ${invTable} inv ON inv.dolibarr_id = fp.invoice_dolibarr_id
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = inv.socid
      WHERE fp.payment_type = ?
        AND fp.payment_date >= ? AND fp.payment_date < ?
        AND COALESCE(dt.name, CONCAT(?, inv.socid)) = ?
      ORDER BY inv.date_invoice DESC, fp.payment_date DESC
    `, type, monthStart, monthEnd, type === 'customer' ? 'Client #' : 'Supplier #', entityName);

    // Group payments under their invoices
    const invoiceMap = new Map<string, {
      invoiceRef: string;
      invoiceSupplierRef: string | null;
      invoiceDate: string | null;
      invoiceAmount: number;
      payments: { ref: string; date: string | null; amount: number; method: string | null }[];
    }>();

    for (const row of rows) {
      if (!invoiceMap.has(row.invoice_ref)) {
        invoiceMap.set(row.invoice_ref, {
          invoiceRef:         row.invoice_ref,
          invoiceSupplierRef: row.invoice_supplier_ref || null,
          invoiceDate:        row.invoice_date ? String(row.invoice_date).substring(0, 10) : null,
          invoiceAmount:      Number(row.invoice_amount || 0),
          payments:           [],
        });
      }
      invoiceMap.get(row.invoice_ref)!.payments.push({
        ref:    row.payment_ref,
        date:   row.payment_date ? String(row.payment_date).substring(0, 10) : null,
        amount: Number(row.payment_amount || 0),
        method: row.payment_method || null,
      });
    }

    return NextResponse.json({ invoices: Array.from(invoiceMap.values()) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
