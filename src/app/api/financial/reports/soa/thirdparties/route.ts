import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/jwt';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const store = await cookies();
  const token = store.get(process.env.COOKIE_NAME || 'ots_session')?.value;
  const session = token ? verifySession(token) : null;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'ar';

  try {
    const table = type === 'ar' ? 'fin_customer_invoices' : 'fin_supplier_invoices';

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT inv.socid as id,
             COALESCE(dt.name, CONCAT('${type === 'ar' ? 'Customer' : 'Supplier'} #', inv.socid)) as name,
             COUNT(*) as invoice_count
      FROM ${table} inv
      LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = inv.socid
      WHERE inv.is_active = 1 AND inv.status >= 1
      GROUP BY inv.socid, dt.name
      ORDER BY name ASC
    `);

    return NextResponse.json(rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      invoice_count: Number(r.invoice_count),
    })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
