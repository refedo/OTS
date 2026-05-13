import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  periodLabel: z.string().min(1),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount:      z.number().positive(),
  reference:   z.string().optional().nullable(),
  notes:       z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');

  try {
    const whereClause = year
      ? `WHERE YEAR(payment_date) = ${parseInt(year, 10)}`
      : '';
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM fin_vat_payments ${whereClause} ORDER BY payment_date DESC`
    );
    return NextResponse.json(rows.map(r => ({ ...r, amount: Number(r.amount) })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireFinancialPermission('financial.edit');
  if ('error' in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 422 });

  const { periodLabel, periodStart, periodEnd, paymentDate, amount, reference, notes } = parsed.data;

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO fin_vat_payments (period_label, period_start, period_end, payment_date, amount, reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      periodLabel, periodStart, periodEnd, paymentDate, amount, reference ?? null, notes ?? null
    );
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM fin_vat_payments ORDER BY id DESC LIMIT 1`
    );
    return NextResponse.json({ ...rows[0], amount: Number(rows[0].amount) }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
