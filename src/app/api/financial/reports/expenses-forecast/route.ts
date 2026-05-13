import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const MONTH_COLS = ['jan_amt', 'feb_amt', 'mar_amt', 'apr_amt', 'may_amt', 'jun_amt',
                    'jul_amt', 'aug_amt', 'sep_amt', 'oct_amt', 'nov_amt', 'dec_amt'] as const;

const DEFAULT_CATEGORIES = [
  { category: 'Salaries',          sort_order: 1 },
  { category: 'GOSI / Saudization', sort_order: 2 },
  { category: 'Electricity',        sort_order: 3 },
  { category: 'Water',              sort_order: 4 },
  { category: 'Maintenance',        sort_order: 5 },
  { category: 'Factory Leases',     sort_order: 6 },
  { category: 'Office Rent',        sort_order: 7 },
  { category: 'Office Expenses',    sort_order: 8 },
  { category: 'Other',              sort_order: 9 },
];

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, year, category, sort_order, notes,
           jan_amt, feb_amt, mar_amt, apr_amt, may_amt, jun_amt,
           jul_amt, aug_amt, sep_amt, oct_amt, nov_amt, dec_amt
    FROM fin_expense_forecast
    WHERE year = ?
    ORDER BY sort_order, category
  `, year);

  const forecast = rows.map(r => ({
    id: Number(r.id),
    year: Number(r.year),
    category: r.category as string,
    sortOrder: Number(r.sort_order),
    notes: r.notes as string | null,
    months: MONTH_COLS.map(col => Number(r[col] ?? 0)) as [number, number, number, number, number, number, number, number, number, number, number, number],
  }));

  // If no rows exist yet, return the default category template with zeros
  if (forecast.length === 0) {
    const defaults = DEFAULT_CATEGORIES.map((d, i) => ({
      id: -(i + 1), // negative id = unsaved
      year,
      category: d.category,
      sortOrder: d.sort_order,
      notes: null,
      months: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number, number, number, number, number, number, number],
    }));
    return NextResponse.json({ year, forecast: defaults, isTemplate: true });
  }

  return NextResponse.json({ year, forecast, isTemplate: false });
}

const MonthSchema = z.number().min(0);

const RowSchema = z.object({
  category: z.string().min(1).max(100),
  sortOrder: z.number().int().min(0),
  notes: z.string().max(500).nullable().optional(),
  months: z.tuple([
    MonthSchema, MonthSchema, MonthSchema, MonthSchema,
    MonthSchema, MonthSchema, MonthSchema, MonthSchema,
    MonthSchema, MonthSchema, MonthSchema, MonthSchema,
  ]),
});

const SaveSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  rows: z.array(RowSchema).min(1).max(200),
});

export async function PUT(req: Request) {
  const auth = await requireFinancialPermission('financial.manage');
  if ('error' in auth) return auth.error;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { year, rows } = parsed.data;

  // Delete all existing rows for this year then re-insert
  await prisma.$executeRawUnsafe(`DELETE FROM fin_expense_forecast WHERE year = ?`, year);

  for (const row of rows) {
    const [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12] = row.months;
    await prisma.$executeRawUnsafe(`
      INSERT INTO fin_expense_forecast
        (year, category, sort_order, notes, jan_amt, feb_amt, mar_amt, apr_amt, may_amt, jun_amt,
         jul_amt, aug_amt, sep_amt, oct_amt, nov_amt, dec_amt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, year, row.category, row.sortOrder, row.notes ?? null,
       m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12);
  }

  return NextResponse.json({ ok: true, year, savedRows: rows.length });
}
