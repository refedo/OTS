import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get('search') ?? '').trim();

  try {
    const pattern = `%${search}%`;
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT dt.dolibarr_id, dt.name, dt.code_supplier
      FROM dolibarr_thirdparties dt
      INNER JOIN fin_supplier_invoices si ON si.socid = dt.dolibarr_id AND si.is_active = 1 AND si.status >= 1
      WHERE (dt.name LIKE ? OR dt.code_supplier LIKE ?)
      ORDER BY dt.name ASC
      LIMIT 30
    `, pattern, pattern);

    return NextResponse.json({
      suppliers: rows.map((r: any) => ({
        id: Number(r.dolibarr_id),
        name: r.name,
        code: r.code_supplier,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
