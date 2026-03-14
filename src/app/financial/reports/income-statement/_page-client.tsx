'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, Printer, ArrowLeft, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

function fmt(n: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function pct(n: number): string {
  return n.toFixed(1) + '%';
}

export default function IncomeStatementPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const exportToExcel = () => {
    if (!report) return;
    setExporting(true);
    try {
      const csvRows: string[] = [];
      csvRows.push('Income Statement,' + report.fromDate + ' to ' + report.toDate);
      csvRows.push('');
      csvRows.push('Category,Account Code,Account Name,Amount,% of Revenue');
      csvRows.push('REVENUE,,,');
      for (const sec of report.revenue || []) {
        for (const a of sec.accounts || []) {
          csvRows.push(`"${sec.category}",${a.accountCode},"${a.accountName}",${a.amount?.toFixed(2)},${a.percentOfRevenue?.toFixed(1)}%`);
        }
      }
      csvRows.push(`Total Revenue,,,${report.totalRevenue?.toFixed(2)},100%`);
      csvRows.push('');
      csvRows.push('COST OF SALES,,,');
      for (const sec of report.costOfSales || []) {
        for (const a of sec.accounts || []) {
          csvRows.push(`"${sec.category || 'Cost of Sales'}",${a.accountCode},"${a.accountName}",${a.amount?.toFixed(2)},${a.percentOfRevenue?.toFixed(1)}%`);
        }
      }
      csvRows.push(`Total Cost of Sales,,,${report.totalCostOfSales?.toFixed(2)},`);
      csvRows.push(`Gross Profit,,,${report.grossProfit?.toFixed(2)},${report.grossProfitMargin?.toFixed(1)}%`);
      csvRows.push('');
      csvRows.push('OPERATING EXPENSES,,,');
      for (const sec of report.operatingExpenses || []) {
        for (const a of sec.accounts || []) {
          csvRows.push(`"${sec.category}",${a.accountCode},"${a.accountName}",${a.amount?.toFixed(2)},${a.percentOfRevenue?.toFixed(1)}%`);
        }
      }
      csvRows.push(`Total Operating Expenses,,,${report.totalOperatingExpenses?.toFixed(2)},`);
      csvRows.push(`Operating Profit,,,${report.operatingProfit?.toFixed(2)},`);
      csvRows.push(`Net Profit,,,${report.netProfit?.toFixed(2)},${report.netProfitMargin?.toFixed(1)}%`);
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `income-statement-${fromDate}-to-${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export Complete', description: 'Income statement exported to CSV' });
    } catch (e) {
      toast({ title: 'Export Failed', description: 'Failed to export report', variant: 'destructive' });
    }
    setExporting(false);
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/income-statement?from=${fromDate}&to=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const totalRev = report?.totalRevenue || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Income Statement (P&L)</h1>
            <p className="text-muted-foreground mt-1">Revenue, expenses, and net profit/loss</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={exportToExcel} disabled={!report || exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Income Statement: {report.fromDate} to {report.toDate}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 font-mono text-sm">
              {/* Revenue */}
              <div className="font-bold text-lg text-green-700 border-b pb-1 mb-1">REVENUE</div>
              {report.revenue.map((sec: any, i: number) => (
                <div key={i}>
                  <div className="font-semibold text-muted-foreground pl-4">{sec.category}</div>
                  {sec.accounts.map((a: any, j: number) => (
                    <div key={j} className="flex justify-between pl-8 hover:bg-muted/30 py-0.5">
                      <span>{a.accountCode} — {a.accountName}</span>
                      <div className="flex gap-8">
                        <span className="w-32 text-right">{fmt(a.amount)}</span>
                        <span className="w-16 text-right text-muted-foreground">{pct(a.percentOfRevenue)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pl-8 font-semibold border-t mt-1 pt-1">
                    <span>Total {sec.category}</span>
                    <span className="w-32 text-right">{fmt(sec.subtotal)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-bold text-green-700 border-t-2 pt-2 mt-2">
                <span>TOTAL REVENUE</span>
                <span className="w-32 text-right">{fmt(report.totalRevenue)}</span>
              </div>

              {/* Cost of Sales */}
              {report.costOfSales.length > 0 && (
                <>
                  <div className="font-bold text-lg text-orange-700 border-b pb-1 mb-1 mt-6">COST OF SALES</div>
                  {report.costOfSales.map((sec: any, i: number) => (
                    <div key={i}>
                      {sec.accounts.map((a: any, j: number) => (
                        <div key={j} className="flex justify-between pl-8 hover:bg-muted/30 py-0.5">
                          <span>{a.accountCode} — {a.accountName}</span>
                          <div className="flex gap-8">
                            <span className="w-32 text-right">{fmt(a.amount)}</span>
                            <span className="w-16 text-right text-muted-foreground">{pct(a.percentOfRevenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-orange-700 border-t-2 pt-2 mt-2">
                    <span>TOTAL COST OF SALES</span>
                    <span className="w-32 text-right">({fmt(report.totalCostOfSales)})</span>
                  </div>
                </>
              )}

              {/* Gross Profit */}
              <div className={`flex justify-between font-bold text-lg border-y-2 py-2 my-4 ${report.grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                <span>GROSS PROFIT</span>
                <span className="w-32 text-right">{fmt(report.grossProfit)}</span>
              </div>

              {/* Operating Expenses */}
              {report.operatingExpenses.length > 0 && (
                <>
                  <div className="font-bold text-lg text-red-700 border-b pb-1 mb-1">OPERATING EXPENSES</div>
                  {report.operatingExpenses.map((sec: any, i: number) => (
                    <div key={i}>
                      <div className="font-semibold text-muted-foreground pl-4">{sec.category}</div>
                      {sec.accounts.map((a: any, j: number) => (
                        <div key={j} className="flex justify-between pl-8 hover:bg-muted/30 py-0.5">
                          <span>{a.accountCode} — {a.accountName}</span>
                          <div className="flex gap-8">
                            <span className="w-32 text-right">{fmt(a.amount)}</span>
                            <span className="w-16 text-right text-muted-foreground">{pct(a.percentOfRevenue)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-red-700 border-t-2 pt-2 mt-2">
                    <span>TOTAL OPERATING EXPENSES</span>
                    <span className="w-32 text-right">({fmt(report.totalOperatingExpenses)})</span>
                  </div>
                </>
              )}

              {/* Operating Profit */}
              <div className={`flex justify-between font-bold border-y py-2 my-4 ${report.operatingProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                <span>OPERATING PROFIT</span>
                <span className="w-32 text-right">{fmt(report.operatingProfit)}</span>
              </div>

              {/* Other Income/Expenses */}
              {(report.otherIncome > 0 || report.otherExpenses > 0) && (
                <div className="space-y-1 mb-4">
                  {report.otherIncome > 0 && (
                    <div className="flex justify-between pl-4">
                      <span>Other Income</span>
                      <span className="w-32 text-right text-green-600">{fmt(report.otherIncome)}</span>
                    </div>
                  )}
                  {report.otherExpenses > 0 && (
                    <div className="flex justify-between pl-4">
                      <span>Other Expenses</span>
                      <span className="w-32 text-right text-red-600">({fmt(report.otherExpenses)})</span>
                    </div>
                  )}
                </div>
              )}

              {/* Net Profit */}
              <div className={`flex justify-between font-bold text-xl border-y-4 py-3 my-4 ${report.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                <span>NET PROFIT / (LOSS)</span>
                <span className="w-40 text-right">
                  {report.netProfit >= 0 ? fmt(report.netProfit) : `(${fmt(Math.abs(report.netProfit))})`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
