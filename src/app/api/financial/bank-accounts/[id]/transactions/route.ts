import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const bankDolibarrId = parseInt(id, 10);
  if (isNaN(bankDolibarrId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit  = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));
  const offset = (page - 1) * limit;

  try {
    const account: any[] = await prisma.$queryRawUnsafe(
      `SELECT dolibarr_id, ref, label, bank_name, balance, currency_code, is_open
       FROM fin_bank_accounts WHERE dolibarr_id = ? LIMIT 1`,
      bankDolibarrId
    );
    if (!account.length) return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });

    // Check if fin_bank_transactions has records for this account
    const btCount: any[] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS cnt FROM fin_bank_transactions WHERE bank_account_dolibarr_id = ?`,
      bankDolibarrId
    );
    const hasBankTransactions = Number(btCount[0]?.cnt ?? 0) > 0;

    let rows: any[];
    let total: number;

    if (hasBankTransactions) {
      // Use fin_bank_transactions (direct bank statement lines from Dolibarr)
      rows = await prisma.$queryRawUnsafe(
        `SELECT
           bt.id,
           bt.num_chq       AS dolibarr_ref,
           NULL             AS payment_type,
           bt.bank_account_dolibarr_id AS bank_account_id,
           bt.amount,
           bt.dateo         AS payment_date,
           bt.fk_type       AS payment_method,
           NULL             AS invoice_ref,
           NULL             AS party_ref,
           bt.label         AS party_name
         FROM fin_bank_transactions bt
         WHERE bt.bank_account_dolibarr_id = ?
         ORDER BY bt.dateo DESC, bt.id DESC
         LIMIT ? OFFSET ?`,
        bankDolibarrId, limit, offset
      );

      const countRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS cnt FROM fin_bank_transactions WHERE bank_account_dolibarr_id = ?`,
        bankDolibarrId
      );
      total = Number(countRows[0]?.cnt ?? 0);
    } else {
      // Fall back to fin_payments linked to invoices for this bank account
      rows = await prisma.$queryRawUnsafe(
        `SELECT
           fp.id,
           fp.dolibarr_ref,
           fp.payment_type,
           fp.invoice_dolibarr_id,
           fp.amount,
           fp.payment_date,
           fp.payment_method,
           CASE fp.payment_type
             WHEN 'customer' THEN ci.ref
             WHEN 'supplier' THEN si.ref
           END AS invoice_ref,
           CASE fp.payment_type
             WHEN 'customer' THEN ci.ref_client
             WHEN 'supplier' THEN si.ref_supplier
           END AS party_ref,
           CASE fp.payment_type
             WHEN 'customer' THEN dt_c.name
             WHEN 'supplier' THEN dt_s.name
           END AS party_name
         FROM fin_payments fp
         LEFT JOIN fin_customer_invoices ci
           ON fp.payment_type = 'customer' AND ci.dolibarr_id = fp.invoice_dolibarr_id
         LEFT JOIN dolibarr_thirdparties dt_c
           ON fp.payment_type = 'customer' AND ci.socid = dt_c.dolibarr_id
         LEFT JOIN fin_supplier_invoices si
           ON fp.payment_type = 'supplier' AND si.dolibarr_id = fp.invoice_dolibarr_id
         LEFT JOIN dolibarr_thirdparties dt_s
           ON fp.payment_type = 'supplier' AND si.socid = dt_s.dolibarr_id
         WHERE fp.bank_account_id = ?
         ORDER BY fp.payment_date DESC, fp.id DESC
         LIMIT ? OFFSET ?`,
        bankDolibarrId, limit, offset
      );

      const countRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS cnt FROM fin_payments WHERE bank_account_id = ?`,
        bankDolibarrId
      );
      total = Number(countRows[0]?.cnt ?? 0);
    }

    const ba = account[0];
    return NextResponse.json({
      account: {
        id: Number(ba.dolibarr_id),
        ref: ba.ref,
        label: ba.label,
        bankName: ba.bank_name,
        balance: Number(ba.balance),
        currency: ba.currency_code,
        isOpen: ba.is_open === 1,
      },
      source: hasBankTransactions ? 'bank_transactions' : 'payments',
      transactions: rows.map(r => ({
        ...r,
        id: Number(r.id),
        amount: Number(r.amount),
        invoice_dolibarr_id: r.invoice_dolibarr_id ? Number(r.invoice_dolibarr_id) : null,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
