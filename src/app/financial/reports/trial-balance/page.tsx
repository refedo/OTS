'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, BarChart3, Printer, AlertTriangle, CheckCircle, ArrowLeft, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const TYPE_COLORS: Record<string, string> = {
  asset: 'text-blue-600', liability: 'text-red-600', equity: 'text-purple-600',
  revenue: 'text-green-600', expense: 'text-orange-600',
};

function fmt(n: number): string {
  return new Intl.NumberFormat('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export default function TrialBalancePage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const exportToExcel = () => {
    if (!report?.rows) return;
    setExporting(true);
    try {
      const headers = ['Account Code', 'Account Name', 'Type', 'Opening Debit', 'Opening Credit', 'Period Debit', 'Period Credit', 'Closing Debit', 'Closing Credit'];
      const csvRows = [headers.join(',')];
      for (const row of report.rows) {
        csvRows.push([
          row.accountCode,
          `"${(row.accountName || '').replace(/"/g, '""')}"`,
          row.accountType,
          row.openingDebit?.toFixed(2) || '0.00',
          row.openingCredit?.toFixed(2) || '0.00',
          row.periodDebit?.toFixed(2) || '0.00',
          row.periodCredit?.toFixed(2) || '0.00',
          row.closingDebit?.toFixed(2) || '0.00',
          row.closingCredit?.toFixed(2) || '0.00',
        ].join(','));
      }
      csvRows.push(['TOTALS', '', '', report.totals.openingDebit?.toFixed(2), report.totals.openingCredit?.toFixed(2), report.totals.periodDebit?.toFixed(2), report.totals.periodCredit?.toFixed(2), report.totals.closingDebit?.toFixed(2), report.totals.closingCredit?.toFixed(2)].join(','));
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trial-balance-${fromDate}-to-${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export Complete', description: 'Trial balance exported to CSV' });
    } catch (e) {
      toast({ title: 'Export Failed', description: 'Failed to export report', variant: 'destructive' });
    }
    setExporting(false);
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/trial-balance?from=${fromDate}&to=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Trial Balance</h1>
            <p className="text-muted-foreground mt-1">Debit and credit balances for all accounts</p>
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
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Trial Balance: {report.fromDate} to {report.toDate}</CardTitle>
            {report.isBalanced ? (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Balanced
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Unbalanced
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Code</th>
                    <th className="text-left p-3 font-medium">Account Name</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-right p-3 font-medium">Opening Dr</th>
                    <th className="text-right p-3 font-medium">Opening Cr</th>
                    <th className="text-right p-3 font-medium">Period Dr</th>
                    <th className="text-right p-3 font-medium">Period Cr</th>
                    <th className="text-right p-3 font-medium">Closing Dr</th>
                    <th className="text-right p-3 font-medium">Closing Cr</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row: any, i: number) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono font-semibold">{row.accountCode}</td>
                      <td className="p-3">{row.accountName}</td>
                      <td className="p-3">
                        <span className={`text-xs font-medium ${TYPE_COLORS[row.accountType] || ''}`}>
                          {row.accountType}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{row.openingDebit > 0 ? fmt(row.openingDebit) : ''}</td>
                      <td className="p-3 text-right font-mono">{row.openingCredit > 0 ? fmt(row.openingCredit) : ''}</td>
                      <td className="p-3 text-right font-mono">{row.periodDebit > 0 ? fmt(row.periodDebit) : ''}</td>
                      <td className="p-3 text-right font-mono">{row.periodCredit > 0 ? fmt(row.periodCredit) : ''}</td>
                      <td className="p-3 text-right font-mono font-semibold">{row.closingDebit > 0 ? fmt(row.closingDebit) : ''}</td>
                      <td className="p-3 text-right font-mono font-semibold">{row.closingCredit > 0 ? fmt(row.closingCredit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-bold">
                    <td className="p-3" colSpan={3}>TOTALS</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.openingDebit)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.openingCredit)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.periodDebit)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.periodCredit)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.closingDebit)}</td>
                    <td className="p-3 text-right font-mono">{fmt(report.totals.closingCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
