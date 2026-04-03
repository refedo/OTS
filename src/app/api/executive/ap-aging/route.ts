import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { withApiContext } from '@/lib/api-utils';
import { checkPermission } from '@/lib/permission-checker';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface SupplierInvoice {
  ref: string;
  supplier_name: string;
  total_ttc: number;
  date_due: string | null;
  date_invoice: string | null;
  status: number;
}

export const GET = withApiContext(async (_req: NextRequest, _session) => {
  const hasAccess = await checkPermission('executive.view');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const thirtyDaysOut = new Date(now);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    const thirtyDaysOutStr = thirtyDaysOut.toISOString().slice(0, 10);
    const sevenDaysOut = new Date(now);
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
    const sevenDaysOutStr = sevenDaysOut.toISOString().slice(0, 10);

    let items: SupplierInvoice[] = [];

    try {
      items = await prisma.$queryRaw<SupplierInvoice[]>`
        SELECT
          si.ref,
          COALESCE(dt.name, CONCAT('Supplier #', si.socid)) AS supplier_name,
          si.total_ttc,
          si.date_due,
          si.date_invoice,
          si.status
        FROM fin_supplier_invoices si
        LEFT JOIN dolibarr_thirdparties dt ON dt.dolibarr_id = si.socid
        WHERE si.is_active = 1
          AND si.status IN (1, 2)
          AND si.date_due IS NOT NULL
          AND si.date_due <= ${thirtyDaysOutStr}
        ORDER BY si.date_due ASC
        LIMIT 200
      `;
    } catch {
      // fin_supplier_invoices may not exist; return empty
      return NextResponse.json({
        data: {
          overdue: { count: 0, totalSAR: 0 },
          dueSoon7: { count: 0, totalSAR: 0 },
          due30Days: { count: 0, totalSAR: 0 },
          items: [],
        },
      });
    }

    const overdue: SupplierInvoice[] = [];
    const dueSoon7: SupplierInvoice[] = [];
    const due30Days: SupplierInvoice[] = [];

    for (const inv of items) {
      const dueDateStr = inv.date_due ? String(inv.date_due).slice(0, 10) : null;
      if (!dueDateStr) continue;
      if (dueDateStr < today) {
        overdue.push(inv);
      } else if (dueDateStr <= sevenDaysOutStr) {
        dueSoon7.push(inv);
      } else {
        due30Days.push(inv);
      }
    }

    const sumSAR = (list: SupplierInvoice[]) =>
      list.reduce((s, i) => s + Number(i.total_ttc || 0), 0);

    const daysOverdue = (inv: SupplierInvoice): number | null => {
      if (!inv.date_due) return null;
      const due = new Date(String(inv.date_due).slice(0, 10));
      const diff = Math.floor((now.getTime() - due.getTime()) / 86400000);
      return diff > 0 ? diff : null;
    };

    return NextResponse.json({
      data: {
        overdue: { count: overdue.length, totalSAR: Math.round(sumSAR(overdue)) },
        dueSoon7: { count: dueSoon7.length, totalSAR: Math.round(sumSAR(dueSoon7)) },
        due30Days: { count: due30Days.length, totalSAR: Math.round(sumSAR(due30Days)) },
        items: items.map(inv => ({
          ref: inv.ref,
          supplierName: inv.supplier_name,
          totalSAR: Number(inv.total_ttc || 0),
          dueDate: inv.date_due ? String(inv.date_due).slice(0, 10) : null,
          daysOverdue: daysOverdue(inv),
          status: inv.status,
        })),
      },
    });
  } catch (error) {
    logger.error({ error }, '[Executive] Failed to fetch AP aging');
    return NextResponse.json({ error: 'Failed to fetch AP aging' }, { status: 500 });
  }
});
