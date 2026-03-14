'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Banknote, FolderOpen, TrendingUp, Percent, DollarSign } from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function ProjectsFinancialDashboardPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/financial/reports/projects-dashboard')
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
          <h1 className="text-2xl font-bold">Projects Financial Dashboard</h1>
          <p className="text-sm text-muted-foreground">Total projects with invoicing, collection, and gross margin</p>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Projects</span>
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-blue-600">{report.totalProjects}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Invoiced</span>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{formatSAR(report.totalInvoiced)}</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Collected</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">{formatSAR(report.totalCollected)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Collection Rate: <span className="font-semibold">{formatPct(report.collectionRate)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 dark:border-purple-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Gross Margin</span>
                  <Percent className="h-4 w-4 text-purple-500" />
                </div>
                <div className={`text-2xl font-bold ${report.grossMargin >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                  {formatSAR(report.grossMargin)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{formatPct(report.grossMarginPct)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Additional KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Outstanding</span>
                  <Banknote className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-orange-600">{formatSAR(report.totalOutstanding)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Supplier Costs</span>
                  <DollarSign className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{formatSAR(report.totalSupplierCosts)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Projects Detail
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
                      <th className="text-right p-3">VAT</th>
                      <th className="text-right p-3">Collected</th>
                      <th className="text-right p-3">Outstanding</th>
                      <th className="text-right p-3">Collection %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.projects.map((p: any) => (
                      <tr key={p.clientId} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{p.clientName}</td>
                        <td className="p-3 text-right">{p.totalInvoices}</td>
                        <td className="p-3 text-right">{formatSAR(p.invoicedHT)}</td>
                        <td className="p-3 text-right">{formatSAR(p.invoicedTTC)}</td>
                        <td className="p-3 text-right text-muted-foreground">{formatSAR(p.vat)}</td>
                        <td className="p-3 text-right text-green-600">{formatSAR(p.collected)}</td>
                        <td className="p-3 text-right text-red-600">{formatSAR(p.outstanding)}</td>
                        <td className="p-3 text-right">
                          <Badge variant={p.collectionRate >= 80 ? 'default' : p.collectionRate >= 50 ? 'secondary' : 'destructive'}>
                            {formatPct(p.collectionRate)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td className="p-3">Total ({report.totalProjects} clients)</td>
                      <td className="p-3 text-right">{report.projects.reduce((s: number, p: any) => s + p.totalInvoices, 0)}</td>
                      <td className="p-3 text-right">{formatSAR(report.projects.reduce((s: number, p: any) => s + p.invoicedHT, 0))}</td>
                      <td className="p-3 text-right">{formatSAR(report.totalInvoiced)}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatSAR(report.projects.reduce((s: number, p: any) => s + p.vat, 0))}</td>
                      <td className="p-3 text-right text-green-600">{formatSAR(report.totalCollected)}</td>
                      <td className="p-3 text-right text-red-600">{formatSAR(report.totalOutstanding)}</td>
                      <td className="p-3 text-right">
                        <Badge variant="outline">{formatPct(report.collectionRate)}</Badge>
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
