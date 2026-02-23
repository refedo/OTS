'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, ArrowLeft, Printer, DollarSign, TrendingUp, TrendingDown,
  Percent, Package, Truck, Users, Wrench, Building2, BarChart3,
  ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import Link from 'next/link';

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `SAR ${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `SAR ${(amount / 1_000).toFixed(1)}K`;
  return formatSAR(amount);
}

const CATEGORY_COLORS: Record<string, string> = {
  'Raw Materials': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Cost of Sales': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Subcontractors': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Transportation': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Labor': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Equipment': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Rent & Facilities': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Operating Expenses': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Administrative Expenses': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Financial Expenses': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  'Other Costs': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  'Uncategorized': 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

const CATEGORY_ICONS: Record<string, any> = {
  'Raw Materials': Package,
  'Cost of Sales': DollarSign,
  'Subcontractors': Users,
  'Transportation': Truck,
  'Labor': Users,
  'Equipment': Wrench,
  'Rent & Facilities': Building2,
};

const BAR_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-cyan-500', 'bg-amber-500', 'bg-pink-500', 'bg-red-500',
  'bg-indigo-500', 'bg-slate-500', 'bg-lime-500', 'bg-rose-500',
];

export default function ProjectCostStructurePage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState(false);
  const [expandedTrend, setExpandedTrend] = useState(true);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/project-cost-structure?from=${fromDate}&to=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const s = report?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Project Cost Structure Analysis</h1>
            <p className="text-muted-foreground mt-1">Breakdown of project costs by category — raw materials, subcontractors, transportation, etc.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
      </div>

      {/* Date Filters */}
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
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Print Header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-bold">Project Cost Structure Analysis</h1>
            <p className="text-sm text-gray-500">Period: {report.fromDate} to {report.toDate}</p>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Project Costs</span>
                  <DollarSign className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{formatCompact(s.totalCostHT)}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatSAR(s.totalCostHT)} (excl. VAT)</div>
                <div className="text-xs text-muted-foreground">VAT: {formatSAR(s.totalVAT)}</div>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">{formatCompact(s.totalRevenue)}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatSAR(s.totalRevenue)}</div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 dark:border-emerald-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Gross Margin</span>
                  <Percent className="h-4 w-4 text-emerald-500" />
                </div>
                <div className={`text-2xl font-bold ${s.grossMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCompact(s.grossMargin)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Margin: <span className={`font-semibold ${s.grossMarginPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPct(s.grossMarginPct)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Cost-to-Revenue</span>
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{formatPct(s.costToRevenueRatio)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.totalSuppliers} suppliers · {s.totalInvoices} invoices
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cost Breakdown by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Visual Bar Chart */}
              <div className="space-y-3 mb-6">
                {report.categories.map((cat: any, idx: number) => {
                  const Icon = CATEGORY_ICONS[cat.category] || DollarSign;
                  const barColor = BAR_COLORS[idx % BAR_COLORS.length];
                  return (
                    <div key={cat.category} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{cat.category}</span>
                          <Badge variant="outline" className="text-xs">{cat.invoiceCount} inv</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">{formatSAR(cat.totalHT)}</span>
                          <span className="text-xs text-muted-foreground w-14 text-right">{formatPct(cat.percentOfTotal)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${Math.max(cat.percentOfTotal, 0.5)}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatPct(cat.percentOfRevenue)} of revenue · {cat.lineCount} line items
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-right p-3 font-medium">Amount (HT)</th>
                      <th className="text-right p-3 font-medium">VAT</th>
                      <th className="text-right p-3 font-medium">Amount (TTC)</th>
                      <th className="text-right p-3 font-medium">Invoices</th>
                      <th className="text-right p-3 font-medium">% of Total</th>
                      <th className="text-right p-3 font-medium">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categories.map((cat: any) => (
                      <tr key={cat.category} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <Badge className={CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Other Costs']}>
                            {cat.category}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono">{formatSAR(cat.totalHT)}</td>
                        <td className="p-3 text-right font-mono text-muted-foreground">{formatSAR(cat.totalVAT)}</td>
                        <td className="p-3 text-right font-mono">{formatSAR(cat.totalTTC)}</td>
                        <td className="p-3 text-right">{cat.invoiceCount}</td>
                        <td className="p-3 text-right font-semibold">{formatPct(cat.percentOfTotal)}</td>
                        <td className="p-3 text-right text-muted-foreground">{formatPct(cat.percentOfRevenue)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right font-mono">{formatSAR(s.totalCostHT)}</td>
                      <td className="p-3 text-right font-mono">{formatSAR(s.totalVAT)}</td>
                      <td className="p-3 text-right font-mono">{formatSAR(s.totalCostTTC)}</td>
                      <td className="p-3 text-right">{s.totalInvoices}</td>
                      <td className="p-3 text-right">100.0%</td>
                      <td className="p-3 text-right">{formatPct(s.costToRevenueRatio)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Cost Trend */}
          {report.monthlyTrend && report.monthlyTrend.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => setExpandedTrend(!expandedTrend)}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Monthly Cost Trend
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {expandedTrend ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {expandedTrend && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Month</th>
                          {report.allCategories.map((cat: string) => (
                            <th key={cat} className="text-right p-3 font-medium text-xs">{cat}</th>
                          ))}
                          <th className="text-right p-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.monthlyTrend.map((m: any) => (
                          <tr key={m.month} className="border-b hover:bg-muted/30">
                            <td className="p-3 font-medium">{m.monthLabel}</td>
                            {report.allCategories.map((cat: string) => (
                              <td key={cat} className="p-3 text-right font-mono text-xs">
                                {m.categories[cat] ? formatSAR(m.categories[cat]) : '—'}
                              </td>
                            ))}
                            <td className="p-3 text-right font-mono font-semibold">{formatSAR(m.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Stacked bar visualization */}
                  <div className="mt-6">
                    <div className="flex items-end gap-1 h-48">
                      {report.monthlyTrend.map((m: any) => {
                        const maxTotal = Math.max(...report.monthlyTrend.map((t: any) => t.total));
                        const heightPct = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0;
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="text-[10px] font-mono text-muted-foreground">{formatCompact(m.total)}</div>
                            <div className="w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${heightPct}%`, minHeight: '4px' }}>
                              {report.allCategories.map((cat: string, idx: number) => {
                                const catAmount = m.categories[cat] || 0;
                                const catPct = m.total > 0 ? (catAmount / m.total) * 100 : 0;
                                return (
                                  <div
                                    key={cat}
                                    className={`${BAR_COLORS[idx % BAR_COLORS.length]} w-full`}
                                    style={{ height: `${catPct}%` }}
                                    title={`${cat}: ${formatSAR(catAmount)}`}
                                  />
                                );
                              })}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-1">{m.monthLabel}</div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-3 mt-4 justify-center">
                      {report.allCategories.map((cat: string, idx: number) => (
                        <div key={cat} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-sm ${BAR_COLORS[idx % BAR_COLORS.length]}`} />
                          <span className="text-xs text-muted-foreground">{cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Top Suppliers */}
          <Card>
            <CardHeader className="cursor-pointer select-none" onClick={() => setExpandedSuppliers(!expandedSuppliers)}>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Cost by Supplier
                  <Badge variant="outline">{report.suppliers.length}</Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {expandedSuppliers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            {expandedSuppliers && (
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">#</th>
                        <th className="text-left p-3 font-medium">Supplier</th>
                        <th className="text-right p-3 font-medium">Amount (HT)</th>
                        <th className="text-right p-3 font-medium">VAT</th>
                        <th className="text-right p-3 font-medium">Amount (TTC)</th>
                        <th className="text-right p-3 font-medium">Invoices</th>
                        <th className="text-right p-3 font-medium">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.suppliers.map((sup: any, idx: number) => (
                        <tr key={sup.supplierId} className="border-b hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">{idx + 1}</td>
                          <td className="p-3 font-medium">{sup.supplierName}</td>
                          <td className="p-3 text-right font-mono">{formatSAR(sup.totalHT)}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">{formatSAR(sup.totalVAT)}</td>
                          <td className="p-3 text-right font-mono">{formatSAR(sup.totalTTC)}</td>
                          <td className="p-3 text-right">{sup.invoiceCount}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${sup.percentOfTotal}%` }} />
                              </div>
                              <span className="font-semibold w-14 text-right">{formatPct(sup.percentOfTotal)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 font-bold bg-muted/50">
                        <td className="p-3" colSpan={2}>Total</td>
                        <td className="p-3 text-right font-mono">{formatSAR(s.totalCostHT)}</td>
                        <td className="p-3 text-right font-mono">{formatSAR(s.totalVAT)}</td>
                        <td className="p-3 text-right font-mono">{formatSAR(s.totalCostTTC)}</td>
                        <td className="p-3 text-right">{s.totalInvoices}</td>
                        <td className="p-3 text-right">100.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
