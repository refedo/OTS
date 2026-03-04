'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ArrowUpDown, ArrowLeft, TrendingUp, TrendingDown, X } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

type DrilldownType = 'in' | 'out' | null;

export default function MonthlyCashFlowPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear.toString());
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - i);
  
  // Drill-down modal state
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownMonth, setDrilldownMonth] = useState<number | null>(null);
  const [drilldownType, setDrilldownType] = useState<DrilldownType>(null);
  const [drilldownData, setDrilldownData] = useState<any>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/financial/reports/cash-flow?year=${year}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setReport(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const openDrilldown = async (month: number, type: DrilldownType) => {
    if (!type) return;
    setDrilldownMonth(month);
    setDrilldownType(type);
    setDrilldownOpen(true);
    setDrilldownLoading(true);
    setDrilldownData(null);
    
    try {
      const res = await fetch(`/api/financial/reports/cash-flow/details?year=${year}&month=${month}&type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setDrilldownData(data);
      }
    } catch (e) {
      console.error('Failed to load drill-down:', e);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(parseInt(year), month - 1, 1).toLocaleString('en', { month: 'long' });
  };

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
                        <td className="p-3 text-right">
                          <button
                            onClick={() => m.cashIn > 0 && openDrilldown(m.month, 'in')}
                            className={`text-green-600 ${m.cashIn > 0 ? 'hover:underline cursor-pointer font-medium' : ''}`}
                            disabled={m.cashIn === 0}
                          >
                            {formatSAR(m.cashIn)}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => m.cashOut > 0 && openDrilldown(m.month, 'out')}
                            className={`text-red-600 ${m.cashOut > 0 ? 'hover:underline cursor-pointer font-medium' : ''}`}
                            disabled={m.cashOut === 0}
                          >
                            {formatSAR(m.cashOut)}
                          </button>
                        </td>
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

      {/* Drill-down Modal */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {drilldownType === 'in' ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              {drilldownType === 'in' ? 'Cash In' : 'Cash Out'} — {drilldownMonth && getMonthName(drilldownMonth)} {year}
            </DialogTitle>
          </DialogHeader>
          
          {drilldownLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : drilldownData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{drilldownData.count} payments</span>
                <span className={`font-bold ${drilldownType === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {formatSAR(drilldownData.total)}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">{drilldownType === 'in' ? 'Customer' : 'Supplier'}</th>
                      <th className="text-left p-2">Invoice</th>
                      <th className="text-left p-2">Payment Ref</th>
                      <th className="text-left p-2">Method</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownData.payments.map((p: any, idx: number) => (
                      <tr key={p.id || idx} className="border-b hover:bg-muted/30">
                        <td className="p-2">{p.date}</td>
                        <td className="p-2 max-w-[200px] truncate" title={p.thirdpartyName}>{p.thirdpartyName}</td>
                        <td className="p-2 font-mono text-xs">{p.invoiceRef}</td>
                        <td className="p-2 font-mono text-xs">{p.paymentRef || '—'}</td>
                        <td className="p-2">
                          {p.method && <Badge variant="outline" className="text-xs">{p.method}</Badge>}
                        </td>
                        <td className={`p-2 text-right font-mono ${drilldownType === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSAR(p.amount)}
                        </td>
                      </tr>
                    ))}
                    {drilldownData.payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No payments found for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Failed to load payment details
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
