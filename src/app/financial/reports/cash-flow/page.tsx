'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowUpDown, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

export default function MonthlyCashFlowPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/financial/reports/cash-flow?year=${year}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setReport(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Monthly Cash In / Cash Out</h1>
            <p className="text-sm text-muted-foreground">Customer collections vs supplier payments by month</p>
          </div>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>{yearOptions.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200 dark:border-green-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Cash In</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{formatSAR(report.totalCashIn)}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Cash Out</span>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{formatSAR(report.totalCashOut)}</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Net Cash Flow</span>
                  <ArrowUpDown className="h-4 w-4 text-blue-500" />
                </div>
                <div className={`text-2xl font-bold ${report.totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatSAR(report.totalNet)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown — {year}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Month</th>
                      <th className="text-right p-3">Cash In (Collections)</th>
                      <th className="text-right p-3">Cash Out (Payments)</th>
                      <th className="text-right p-3">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.months.map((m: any) => (
                      <tr key={m.month} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{m.monthName} {year}</td>
                        <td className="p-3 text-right text-green-600">{formatSAR(m.cashIn)}</td>
                        <td className="p-3 text-right text-red-600">{formatSAR(m.cashOut)}</td>
                        <td className={`p-3 text-right font-semibold ${m.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSAR(m.net)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right text-green-600">{formatSAR(report.totalCashIn)}</td>
                      <td className="p-3 text-right text-red-600">{formatSAR(report.totalCashOut)}</td>
                      <td className={`p-3 text-right ${report.totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatSAR(report.totalNet)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
