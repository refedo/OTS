import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

const updateSchema = z.object({
  periodLabel: z.string().min(1).optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount:      z.number().positive().optional(),
  reference:   z.string().optional().nullable(),
  notes:       z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.edit');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const rowId = parseInt(id, 10);
  if (isNaN(rowId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  const d = parsed.data;
  const fields: string[] = [];
  const args: unknown[] = [];

  if (d.periodLabel !== undefined) { fields.push('period_label = ?'); args.push(d.periodLabel); }
  if (d.periodStart !== undefined) { fields.push('period_start = ?'); args.push(d.periodStart); }
  if (d.periodEnd   !== undefined) { fields.push('period_end = ?');   args.push(d.periodEnd); }
  if (d.paymentDate !== undefined) { fields.push('payment_date = ?'); args.push(d.paymentDate); }
  if (d.amount      !== undefined) { fields.push('amount = ?');       args.push(d.amount); }
  if (d.reference   !== undefined) { fields.push('reference = ?');    args.push(d.reference); }
  if (d.notes       !== undefined) { fields.push('notes = ?');        args.push(d.notes); }

  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 422 });

  try {
    await prisma.$executeRawUnsafe(
      `UPDATE fin_vat_payments SET ${fields.join(', ')} WHERE id = ?`,
      ...args, rowId
    );
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM fin_vat_payments WHERE id = ?`, rowId
    );
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ...rows[0], amount: Number(rows[0].amount) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFinancialPermission('financial.edit');
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const rowId = parseInt(id, 10);
  if (isNaN(rowId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM fin_vat_payments WHERE id = ?`, rowId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
