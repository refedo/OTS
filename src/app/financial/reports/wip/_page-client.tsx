'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Wallet } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

export default function WIPReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/financial/reports/wip')
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
          <h1 className="text-2xl font-bold">Work-In-Progress (WIP) Report</h1>
          <p className="text-sm text-muted-foreground">Invoiced but not yet fully collected / paid</p>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">AR WIP (Receivables)</span>
                  <Wallet className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{formatSAR(report.totalARWip)}</div>
                <div className="text-xs text-muted-foreground mt-1">{report.receivables.length} invoices outstanding</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">AP WIP (Payables)</span>
                  <Wallet className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{formatSAR(report.totalAPWip)}</div>
                <div className="text-xs text-muted-foreground mt-1">{report.payables.length} invoices outstanding</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Net WIP</span>
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </div>
                <div className={`text-2xl font-bold ${report.netWip >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatSAR(report.netWip)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">AR WIP − AP WIP</div>
              </CardContent>
            </Card>
          </div>

          {/* Receivables Table */}
          <Card>
            <CardHeader>
              <CardTitle>Receivables WIP (Unpaid Customer Invoices)</CardTitle>
            </CardHeader>
            <CardContent>
              {report.receivables.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No outstanding receivables</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Client</th>
                        <th className="text-left p-3">Ref</th>
                        <th className="text-left p-3">Invoice Date</th>
                        <th className="text-left p-3">Due Date</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-right p-3">Paid</th>
                        <th className="text-right p-3">WIP Amount</th>
                        <th className="text-right p-3">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.receivables.map((r: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{r.clientName}</td>
                          <td className="p-3 font-mono text-xs">{r.ref}</td>
                          <td className="p-3">{r.dateInvoice}</td>
                          <td className="p-3">{r.dateDue}</td>
                          <td className="p-3 text-right">{formatSAR(r.totalAmount)}</td>
                          <td className="p-3 text-right text-green-600">{formatSAR(r.amountPaid)}</td>
                          <td className="p-3 text-right font-semibold text-blue-600">{formatSAR(r.wipAmount)}</td>
                          <td className="p-3 text-right">
                            <Badge variant={r.daysSinceInvoice > 90 ? 'destructive' : r.daysSinceInvoice > 30 ? 'secondary' : 'outline'}>
                              {r.daysSinceInvoice}d
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-bold bg-muted/50">
                        <td className="p-3" colSpan={6}>Total</td>
                        <td className="p-3 text-right text-blue-600">{formatSAR(report.totalARWip)}</td>
                        <td className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payables Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payables WIP (Unpaid Supplier Invoices)</CardTitle>
            </CardHeader>
            <CardContent>
              {report.payables.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No outstanding payables</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Supplier</th>
                        <th className="text-left p-3">Ref</th>
                        <th className="text-left p-3">Invoice Date</th>
                        <th className="text-left p-3">Due Date</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-right p-3">Paid</th>
                        <th className="text-right p-3">WIP Amount</th>
                        <th className="text-right p-3">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.payables.map((r: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{r.supplierName}</td>
                          <td className="p-3 font-mono text-xs">{r.ref}</td>
                          <td className="p-3">{r.dateInvoice}</td>
                          <td className="p-3">{r.dateDue}</td>
                          <td className="p-3 text-right">{formatSAR(r.totalAmount)}</td>
                          <td className="p-3 text-right text-green-600">{formatSAR(r.amountPaid)}</td>
                          <td className="p-3 text-right font-semibold text-red-600">{formatSAR(r.wipAmount)}</td>
                          <td className="p-3 text-right">
                            <Badge variant={r.daysSinceInvoice > 90 ? 'destructive' : r.daysSinceInvoice > 30 ? 'secondary' : 'outline'}>
                              {r.daysSinceInvoice}d
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-bold bg-muted/50">
                        <td className="p-3" colSpan={6}>Total</td>
                        <td className="p-3 text-right text-red-600">{formatSAR(report.totalAPWip)}</td>
                        <td className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
