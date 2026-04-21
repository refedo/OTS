import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') === 'ap' ? 'supplier' : 'customer';

  const invoiceTable = type === 'supplier' ? 'fin_supplier_invoices' : 'fin_customer_invoices';
  const lineTable = type === 'supplier' ? 'fin_supplier_invoice_lines' : 'fin_customer_invoice_lines';
  const paymentType = type === 'supplier' ? 'supplier' : 'customer';

  try {
    const invoiceRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT inv.dolibarr_id, inv.ref, inv.total_ht, inv.total_tva, inv.total_ttc,
              inv.date_invoice, inv.date_due, inv.is_paid, inv.status, inv.type,
              ${type === 'supplier' ? 'inv.ref_supplier,' : ''}
              COALESCE(dt.name, CONCAT('Party #', inv.socid)) as thirdparty_name
       FROM ${invoiceTable} inv
       LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = inv.socid
       WHERE inv.dolibarr_id = ? AND inv.is_active = 1
       LIMIT 1`,
      Number(id)
    );

    if (!invoiceRows.length) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const inv = invoiceRows[0];

    const lines: any[] = await prisma.$queryRawUnsafe(
      `SELECT line_id, product_ref, product_label, qty, unit_price_ht, vat_rate,
              total_ht, total_tva, total_ttc, accounting_code
       FROM ${lineTable}
       WHERE invoice_dolibarr_id = ?
       ORDER BY line_id ASC`,
      Number(id)
    );

    const payments: any[] = await prisma.$queryRawUnsafe(
      `SELECT fp.dolibarr_ref, fp.amount, fp.payment_date, fp.payment_method,
              ba.label as bank_label, ba.bank_name
       FROM fin_payments fp
       LEFT JOIN fin_bank_accounts ba ON ba.dolibarr_id = fp.bank_account_id
       WHERE fp.invoice_dolibarr_id = ? AND fp.payment_type = ?
       ORDER BY fp.payment_date ASC`,
      Number(id),
      paymentType
    );

    return NextResponse.json({
      id: Number(inv.dolibarr_id),
      ref: inv.ref,
      refSupplier: inv.ref_supplier ?? null,
      thirdpartyName: inv.thirdparty_name,
      type,
      dateInvoice: inv.date_invoice ? new Date(inv.date_invoice).toISOString().slice(0, 10) : null,
      dateDue: inv.date_due ? new Date(inv.date_due).toISOString().slice(0, 10) : null,
      totalHt: Number(inv.total_ht),
      totalTva: Number(inv.total_tva),
      totalTtc: Number(inv.total_ttc),
      isPaid: Boolean(inv.is_paid),
      status: Number(inv.status),
      isCreditNote: Number(inv.type) === 2,
      lines: lines.map(l => ({
        lineId: Number(l.line_id),
        productRef: l.product_ref,
        productLabel: l.product_label,
        qty: Number(l.qty),
        unitPriceHt: Number(l.unit_price_ht),
        vatRate: Number(l.vat_rate),
        totalHt: Number(l.total_ht),
        totalTva: Number(l.total_tva),
        totalTtc: Number(l.total_ttc),
        accountingCode: l.accounting_code,
      })),
      payments: payments.map(p => ({
        ref: p.dolibarr_ref,
        amount: Number(p.amount),
        date: p.payment_date ? new Date(p.payment_date).toISOString().slice(0, 10) : null,
        method: p.payment_method,
        bankLabel: p.bank_label,
        bankName: p.bank_name,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
