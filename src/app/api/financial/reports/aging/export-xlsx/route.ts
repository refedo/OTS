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

  try {
    const service = new FinancialReportService();
    const report = await service.getAgingReport(type, asOf);

    const label = type === 'ar' ? 'Accounts Receivable' : 'Accounts Payable';

    // Summary sheet rows
    const summaryRows = report.rows.map(row => ({
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
      'Invoices': report.rows.reduce((s, r) => s + r.invoices.length, 0),
      'Current': fmt(report.totals.current),
      '1-30 Days': fmt(report.totals.days1to30),
      '31-60 Days': fmt(report.totals.days31to60),
      '61-90 Days': fmt(report.totals.days61to90),
      '90+ Days': fmt(report.totals.days90plus),
      'Total': fmt(report.totals.total),
    });

    // Detail sheet rows
    const detailRows = report.rows.flatMap(row =>
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
