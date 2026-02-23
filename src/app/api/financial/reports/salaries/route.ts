import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromDate = searchParams.get('from') || `${new Date().getFullYear()}-01-01`;
  const toDate = searchParams.get('to') || new Date().toISOString().slice(0, 10);

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        dolibarr_id as id,
        ref,
        label,
        amount,
        date_start,
        date_end,
        fk_user,
        is_paid
      FROM fin_salaries
      WHERE is_active = 1
        AND date_start BETWEEN ? AND ?
      ORDER BY date_start DESC, amount DESC
    `, fromDate, toDate);

    const salaries = rows.map((r: any) => ({
      id: Number(r.id),
      ref: r.ref || `SAL-${r.id}`,
      label: r.label || '',
      amount: Number(r.amount || 0),
      dateStart: r.date_start ? new Date(r.date_start).toISOString().slice(0, 10) : '',
      dateEnd: r.date_end ? new Date(r.date_end).toISOString().slice(0, 10) : '',
      userId: Number(r.fk_user || 0),
      isPaid: r.is_paid === 1,
    }));

    const totalAmount = salaries.reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({ salaries, totalAmount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
