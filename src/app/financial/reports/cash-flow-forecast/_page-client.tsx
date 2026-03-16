'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, TrendingUp, Landmark } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

export default function CashFlowForecastPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/financial/reports/cash-flow-forecast')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setReport(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/financial">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Cash Flow Forecast</h1>
          <p className="text-sm text-muted-foreground">13-week rolling projection based on invoice due dates</p>
        </div>
      </div>

      {report && (
        <>
          <Card className="border-blue-200 dark:border-blue-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Landmark className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm text-muted-foreground">Opening Balance (Current Bank Total)</div>
                  <div className="text-2xl font-bold text-blue-600">{formatSAR(report.openingBalance)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13-Week Rolling Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Week</th>
                      <th className="text-left p-3">Period</th>
                      <th className="text-right p-3">Expected Collections</th>
                      <th className="text-right p-3">Expected Payments</th>
                      <th className="text-right p-3">Net Flow</th>
                      <th className="text-right p-3">Projected Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.weeks.map((w: any) => (
                      <tr key={w.week} className={`border-b hover:bg-muted/30 ${w.projectedBalance < 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                        <td className="p-3 font-medium">Week {w.week}</td>
                        <td className="p-3 text-xs text-muted-foreground">{w.weekStart} — {w.weekEnd}</td>
                        <td className="p-3 text-right text-green-600">{formatSAR(w.expectedCollections)}</td>
                        <td className="p-3 text-right text-red-600">{formatSAR(w.expectedPayments)}</td>
                        <td className={`p-3 text-right font-medium ${w.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatSAR(w.netFlow)}
                        </td>
                        <td className={`p-3 text-right font-bold ${w.projectedBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatSAR(w.projectedBalance)}
                          {w.projectedBalance < 0 && (
                            <Badge variant="destructive" className="ml-2 text-xs">Deficit</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                Generated: {new Date(report.generatedAt).toLocaleString()}. Forecast based on unpaid invoice due dates.
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
