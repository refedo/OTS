import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET  /api/financial/payments?invoiceDolibarrId=X&type=supplier|customer
// Returns all OTS payments for an invoice so the UI can show what's stored.
export async function GET(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const invoiceDolibarrId = searchParams.get('invoiceDolibarrId');
  const type = searchParams.get('type') || 'supplier';

  if (!invoiceDolibarrId) {
    return NextResponse.json({ error: 'invoiceDolibarrId is required' }, { status: 400 });
  }

  const rows: { id: number; dolibarr_ref: string; amount: string; payment_date: string; payment_method: string }[] =
    await prisma.$queryRawUnsafe(
      `SELECT id, dolibarr_ref, amount, payment_date, payment_method
       FROM fin_payments
       WHERE payment_type = ? AND invoice_dolibarr_id = ?
       ORDER BY payment_date DESC`,
      type, Number(invoiceDolibarrId)
    );

  return NextResponse.json({ payments: rows });
}

// DELETE /api/financial/payments  body: { refs: string[], type: 'supplier'|'customer' }
// Directly removes payment records from fin_payments by dolibarr_ref.
// Used as a manual override when a deleted Dolibarr payment persists in OTS.
export async function DELETE(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const schema = z.object({
    refs: z.array(z.string().min(1)).min(1),
    type: z.enum(['supplier', 'customer']).default('supplier'),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', detail: parsed.error.flatten() }, { status: 400 });
  }

  const { refs, type } = parsed.data;
  const placeholders = refs.map(() => '?').join(',');
  const deleted = await prisma.$executeRawUnsafe(
    `DELETE FROM fin_payments WHERE payment_type = ? AND dolibarr_ref IN (${placeholders})`,
    type, ...refs
  );

  console.log(`[FinPayments] Manual delete: ${deleted} ${type} payment(s) removed by ${auth.session.name}: [${refs.join(', ')}]`);

  return NextResponse.json({ deleted: Number(deleted), refs });
}
