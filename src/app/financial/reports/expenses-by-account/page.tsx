'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ExpensesByAccountPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [year]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/expenses-by-account?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const url = `/api/financial/reports/expenses-by-account?year=${year}&export=excel`;
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `expenses-by-account-${year}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatAmount = (amount: number) => {
    if (amount === 0) return '0.00';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const compact = (num: number) => {
    if (num === 0) return '—';
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses by Account</h1>
          <p className="text-sm text-muted-foreground">Monthly breakdown of expenses grouped by accounting account</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {report && (
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : report ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {year} Expenses by Account
              <span className="text-sm font-normal text-muted-foreground">
                ({report.summary.accountCount} accounts)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 bg-muted/50">
                    <th className="text-left py-2 px-2 font-semibold sticky left-0 bg-muted/50 z-10 min-w-[100px]">Account</th>
                    <th className="text-left py-2 px-2 font-semibold min-w-[200px]">Account Name</th>
                    {MONTH_NAMES.map(month => (
                      <th key={month} className="text-right py-2 px-2 font-semibold min-w-[80px]">{month}</th>
                    ))}
                    <th className="text-right py-2 px-2 font-semibold bg-blue-50 min-w-[100px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.accounts.map((acc: any, idx: number) => (
                    <tr key={acc.accountingCode} className={`border-b hover:bg-muted/30 ${idx % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                      <td className="py-1.5 px-2 font-mono text-[11px] font-semibold sticky left-0 bg-inherit z-10">{acc.accountCode}</td>
                      <td className="py-1.5 px-2 text-[11px] max-w-[250px] truncate" title={acc.accountLabel}>{acc.accountLabel}</td>
                      {acc.months.map((amount: number, monthIdx: number) => (
                        <td key={monthIdx} className={`py-1.5 px-2 text-right font-mono text-[11px] ${amount > 0 ? 'text-blue-600' : 'text-muted-foreground/30'}`}>
                          {amount > 0 ? formatAmount(amount) : '0.00'}
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-right font-mono text-[11px] font-semibold bg-blue-50 text-blue-700">
                        {formatAmount(acc.total)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 font-bold bg-slate-100">
                    <td className="py-2 px-2 sticky left-0 bg-slate-100 z-10">TOTAL</td>
                    <td className="py-2 px-2"></td>
                    {report.monthlyTotals.map((total: number, idx: number) => (
                      <td key={idx} className="py-2 px-2 text-right font-mono text-[11px] text-slate-700">
                        {formatAmount(total)}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-right font-mono text-[11px] bg-blue-100 text-blue-800">
                      {formatAmount(report.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="mt-4 pt-4 border-t flex gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Total Accounts:</span>
                <span className="ml-2 font-semibold">{report.summary.accountCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Expenses:</span>
                <span className="ml-2 font-semibold text-blue-700">SAR {compact(report.summary.totalExpenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data available for {year}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
