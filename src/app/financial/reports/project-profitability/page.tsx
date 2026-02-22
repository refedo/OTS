'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, FolderOpen, TrendingUp, DollarSign, Percent } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function ProjectProfitabilityPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/financial/reports/project-profitability')
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

  const s = report?.summary || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/financial">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Project Profitability Report</h1>
          <p className="text-sm text-muted-foreground">P&L by client — invoiced, collected, and margins</p>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Invoiced</span>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{formatSAR(s.totalInvoiced)}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Collected</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{formatSAR(s.totalCollected)}</div>
                <div className="text-xs text-muted-foreground mt-1">Collection Rate: {formatPct(s.collectionRate)}</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Costs</span>
                  <DollarSign className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{formatSAR(s.totalCosts)}</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Gross Margin</span>
                  <Percent className="h-4 w-4 text-emerald-500" />
                </div>
                <div className={`text-2xl font-bold ${s.grossMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatSAR(s.grossMargin)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{formatPct(s.grossMarginPct)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Client Revenue Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Revenue by Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3">Client</th>
                      <th className="text-right p-3">Invoices</th>
                      <th className="text-right p-3">Invoiced (HT)</th>
                      <th className="text-right p-3">Invoiced (TTC)</th>
                      <th className="text-right p-3">Collected</th>
                      <th className="text-right p-3">Outstanding</th>
                      <th className="text-right p-3">Collection %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.projects.map((p: any) => (
                      <tr key={p.clientId} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{p.clientName}</td>
                        <td className="p-3 text-right">{p.invoiceCount}</td>
                        <td className="p-3 text-right">{formatSAR(p.invoicedHT)}</td>
                        <td className="p-3 text-right">{formatSAR(p.invoicedTTC)}</td>
                        <td className="p-3 text-right text-green-600">{formatSAR(p.collected)}</td>
                        <td className="p-3 text-right text-red-600">{formatSAR(p.outstanding)}</td>
                        <td className="p-3 text-right">
                          <Badge variant={p.collectionRate >= 80 ? 'default' : p.collectionRate >= 50 ? 'secondary' : 'destructive'}>
                            {formatPct(p.collectionRate)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Costs Table */}
          {report.supplierCosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Supplier Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3">Supplier</th>
                        <th className="text-right p-3">Cost (HT)</th>
                        <th className="text-right p-3">Cost (TTC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.supplierCosts.map((c: any) => (
                        <tr key={c.supplierId} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-medium">{c.supplierName}</td>
                          <td className="p-3 text-right">{formatSAR(c.costHT)}</td>
                          <td className="p-3 text-right">{formatSAR(c.costTTC)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-bold bg-muted/50">
                        <td className="p-3">Total</td>
                        <td className="p-3 text-right">{formatSAR(report.supplierCosts.reduce((s: number, c: any) => s + c.costHT, 0))}</td>
                        <td className="p-3 text-right">{formatSAR(s.totalCosts)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
