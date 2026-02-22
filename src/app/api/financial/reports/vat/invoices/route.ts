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
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const vatRate = searchParams.get('vat_rate');
  const type = searchParams.get('type'); // 'output' or 'input'

  if (!from || !to || !vatRate || !type) {
    return NextResponse.json({ error: 'Missing required params: from, to, vat_rate, type' }, { status: 400 });
  }

  try {
    let invoices: any[] = [];

    if (type === 'output') {
      invoices = await prisma.$queryRawUnsafe(`
        SELECT ci.ref, ci.date_invoice, ci.total_ht, ci.total_tva, ci.total_ttc,
               COALESCE(dt.name, CONCAT('Client #', ci.socid)) as thirdparty_name,
               cil.product_label, cil.qty, cil.unit_price_ht, cil.vat_rate,
               cil.total_ht as line_ht, cil.total_tva as line_tva, cil.total_ttc as line_ttc
        FROM fin_customer_invoice_lines cil
        JOIN fin_customer_invoices ci ON ci.dolibarr_id = cil.invoice_dolibarr_id
        LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = ci.socid
        WHERE ci.date_invoice BETWEEN ? AND ?
          AND ci.status >= 1 AND ci.is_active = 1
          AND cil.vat_rate = ?
        ORDER BY ci.date_invoice DESC
      `, from, to, parseFloat(vatRate));
    } else {
      invoices = await prisma.$queryRawUnsafe(`
        SELECT si.ref, si.date_invoice, si.total_ht, si.total_tva, si.total_ttc,
               COALESCE(dt.name, CONCAT('Supplier #', si.socid)) as thirdparty_name,
               sil.product_label, sil.qty, sil.unit_price_ht, sil.vat_rate,
               sil.total_ht as line_ht, sil.total_tva as line_tva, sil.total_ttc as line_ttc
        FROM fin_supplier_invoice_lines sil
        JOIN fin_supplier_invoices si ON si.dolibarr_id = sil.invoice_dolibarr_id
        LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
        WHERE si.date_invoice BETWEEN ? AND ?
          AND si.status >= 1 AND si.is_active = 1
          AND sil.vat_rate = ?
        ORDER BY si.date_invoice DESC
      `, from, to, parseFloat(vatRate));
    }

    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
