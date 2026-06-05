import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { FinancialReportService } from '@/lib/financial/report-service';
import { requireFinancialPermission } from '@/lib/financial/require-financial-permission';

export const dynamic = 'force-dynamic';

function fmt(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(req: Request) {
  const auth = await requireFinancialPermission('financial.view');
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') || 'ar') as 'ar' | 'ap';
  const asOf = searchParams.get('as_of') || new Date().toISOString().slice(0, 10);
  const minAmount = Math.max(0, parseFloat(searchParams.get('min_amount') || '0') || 0);

  try {
    const service = new FinancialReportService();
    const report = await service.getAgingReport(type, asOf);

    const label = type === 'ar' ? 'Accounts Receivable' : 'Accounts Payable';

    // Exclude third parties whose total outstanding is below the requested minimum.
    const rows = minAmount > 0
      ? report.rows.filter(row => row.buckets.total >= minAmount)
      : report.rows;

    // Totals recomputed from the filtered rows so the spreadsheet matches the screen.
    const totals = rows.reduce(
      (acc, r) => ({
        current: acc.current + r.buckets.current,
        days1to30: acc.days1to30 + r.buckets.days1to30,
        days31to60: acc.days31to60 + r.buckets.days31to60,
        days61to90: acc.days61to90 + r.buckets.days61to90,
        days90plus: acc.days90plus + r.buckets.days90plus,
        total: acc.total + r.buckets.total,
      }),
      { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, total: 0 },
    );

    // Summary sheet rows
    const summaryRows = rows.map(row => ({
      'Third Party': row.thirdpartyName,
      'Invoices': row.invoices.length,
      'Current': fmt(row.buckets.current),
      '1-30 Days': fmt(row.buckets.days1to30),
      '31-60 Days': fmt(row.buckets.days31to60),
      '61-90 Days': fmt(row.buckets.days61to90),
      '90+ Days': fmt(row.buckets.days90plus),
      'Total': fmt(row.buckets.total),
    }));

    // Totals row
    summaryRows.push({
      'Third Party': 'TOTAL',
      'Invoices': rows.reduce((s, r) => s + r.invoices.length, 0),
      'Current': fmt(totals.current),
      '1-30 Days': fmt(totals.days1to30),
      '31-60 Days': fmt(totals.days31to60),
      '61-90 Days': fmt(totals.days61to90),
      '90+ Days': fmt(totals.days90plus),
      'Total': fmt(totals.total),
    });

    // Detail sheet rows
    const detailRows = rows.flatMap(row =>
      row.invoices.map((inv: Record<string, unknown>) => ({
        'Third Party': row.thirdpartyName,
        'Invoice Ref': inv.ref,
        'Invoice Date': inv.dateInvoice,
        'Due Date': inv.dateDue,
        'Days Overdue': inv.daysOverdue,
        'Age Bucket': inv.ageBucket,
        'Total Amount': fmt(Number(inv.totalAmount)),
        'Amount Paid': fmt(Number(inv.amountPaid)),
        'Remaining': fmt(Number(inv.remaining)),
      }))
    );

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    wsDetail['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Invoice Detail');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const filename = `${label.replace(/ /g, '_')}_Aging_${asOf}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
