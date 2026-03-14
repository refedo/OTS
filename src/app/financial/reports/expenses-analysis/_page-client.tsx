'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, ArrowLeft, Printer, DollarSign, TrendingUp, TrendingDown,
  Percent, BarChart3, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
  Package, Truck, Users, Wrench, Building2, FileText, ShoppingCart,
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
  'Cost of Sales': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Raw Materials': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Subcontractors': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Transportation': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Labor': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Equipment': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Rent & Facilities': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Operating Expenses': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Administrative Expenses': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Financial Expenses': 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  'Other Expenses': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  'Other Costs': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  'Uncategorized': 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

const BAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-blue-500', 'bg-emerald-500',
  'bg-purple-500', 'bg-cyan-500', 'bg-amber-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-slate-500', 'bg-lime-500', 'bg-rose-500',
];

const CATEGORY_ICONS: Record<string, any> = {
  'Raw Materials': Package,
  'Cost of Sales': DollarSign,
  'Subcontractors': Users,
  'Transportation': Truck,
  'Labor': Users,
  'Equipment': Wrench,
  'Rent & Facilities': Building2,
  'Operating Expenses': ShoppingCart,
  'Administrative Expenses': FileText,
};

export default function ExpensesAnalysisPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`);
  const [toDate, setToDate] = useState(`${currentYear}-12-31`);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showSupplierBreakdown, setShowSupplierBreakdown] = useState(false);
  const [showTopItems, setShowTopItems] = useState(false);
  const [showMonthlyTrend, setShowMonthlyTrend] = useState(true);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/expenses-analysis?from=${fromDate}&to=${toDate}`);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    setExpandedCategories(next);
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
            <h1 className="text-3xl font-bold">Expenses Analysis Report</h1>
            <p className="text-muted-foreground mt-1">Detailed expense breakdown by category, supplier, and trend analysis</p>
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
            <h1 className="text-2xl font-bold">Expenses Analysis Report</h1>
            <p className="text-sm text-gray-500">Period: {report.fromDate} to {report.toDate}</p>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600">{formatCompact(s.totalExpenses)}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatSAR(s.totalExpenses)}</div>
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

            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Expense Ratio</span>
                  <Percent className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{formatPct(s.expenseToRevenueRatio)}</div>
                <div className="text-xs text-muted-foreground mt-1">of revenue</div>
              </CardContent>
            </Card>

            <Card className={`${s.netProfit >= 0 ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-red-200 dark:border-red-900/50'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Net Profit</span>
                  <DollarSign className={`h-4 w-4 ${s.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                </div>
                <div className={`text-2xl font-bold ${s.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCompact(s.netProfit)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Margin: <span className={`font-semibold ${s.netMarginPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPct(s.netMarginPct)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={`${s.changeFromPrevPeriod <= 0 ? 'border-green-200 dark:border-green-900/50' : 'border-orange-200 dark:border-orange-900/50'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">vs Prev Period</span>
                  {s.changeFromPrevPeriod <= 0
                    ? <ArrowDownRight className="h-4 w-4 text-green-500" />
                    : <ArrowUpRight className="h-4 w-4 text-orange-500" />
                  }
                </div>
                <div className={`text-2xl font-bold ${s.changeFromPrevPeriod <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {s.changeFromPrevPeriod > 0 ? '+' : ''}{formatPct(s.changeFromPrevPeriod)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Prev: {formatCompact(s.prevPeriodExpenses)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense Categories with Drill-Down */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Expense Categories
                <Badge variant="outline">{s.categoryCount} categories</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Visual Distribution */}
              <div className="space-y-3 mb-6">
                {report.categories.map((cat: any, idx: number) => {
                  const Icon = CATEGORY_ICONS[cat.category] || DollarSign;
                  const barColor = BAR_COLORS[idx % BAR_COLORS.length];
                  const isExpanded = expandedCategories.has(cat.category);
                  return (
                    <div key={cat.category}>
                      <div
                        className="cursor-pointer hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors"
                        onClick={() => toggleCategory(cat.category)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cat.category}</span>
                            <Badge variant="outline" className="text-xs">{cat.accounts.length} accounts</Badge>
                            {isExpanded
                              ? <ChevronUp className="h-3 w-3 text-muted-foreground" />
                              : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            }
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{formatSAR(cat.subtotal)}</span>
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
                          {formatPct(cat.percentOfRevenue)} of revenue
                        </div>
                      </div>

                      {/* Expanded account details */}
                      {isExpanded && cat.accounts.length > 0 && (
                        <div className="ml-6 mt-2 mb-3 border-l-2 border-muted pl-4">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2 font-medium">Account Code</th>
                                <th className="text-left p-2 font-medium">Account Name</th>
                                <th className="text-right p-2 font-medium">Amount</th>
                                <th className="text-right p-2 font-medium">% of Category</th>
                                <th className="text-right p-2 font-medium">% of Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.accounts.map((acct: any) => (
                                <tr key={acct.accountCode} className="border-b hover:bg-muted/20">
                                  <td className="p-2 font-mono">{acct.accountCode}</td>
                                  <td className="p-2">{acct.accountName}</td>
                                  <td className="p-2 text-right font-mono">{formatSAR(acct.amount)}</td>
                                  <td className="p-2 text-right">{formatPct(acct.percentOfCategory)}</td>
                                  <td className="p-2 text-right text-muted-foreground">{formatPct(acct.percentOfTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary Table */}
              <div className="overflow-x-auto border-t pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Category</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-right p-3 font-medium">% of Total</th>
                      <th className="text-right p-3 font-medium">% of Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categories.map((cat: any) => (
                      <tr key={cat.category} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <Badge className={CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Uncategorized']}>
                            {cat.category}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono">{formatSAR(cat.subtotal)}</td>
                        <td className="p-3 text-right font-semibold">{formatPct(cat.percentOfTotal)}</td>
                        <td className="p-3 text-right text-muted-foreground">{formatPct(cat.percentOfRevenue)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td className="p-3">Total Expenses</td>
                      <td className="p-3 text-right font-mono">{formatSAR(s.totalExpenses)}</td>
                      <td className="p-3 text-right">100.0%</td>
                      <td className="p-3 text-right">{formatPct(s.expenseToRevenueRatio)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Expense Trend */}
          {report.monthlyTrend && report.monthlyTrend.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => setShowMonthlyTrend(!showMonthlyTrend)}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Monthly Expense Trend
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {showMonthlyTrend ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showMonthlyTrend && (
                <CardContent>
                  {/* Stacked bar visualization */}
                  <div className="mb-6">
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

                  {/* Monthly Table */}
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
                </CardContent>
              )}
            </Card>
          )}

          {/* Supplier Breakdown by Category */}
          {report.supplierCategories && report.supplierCategories.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => setShowSupplierBreakdown(!showSupplierBreakdown)}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Supplier Expenses by Category
                    <Badge variant="outline">{report.supplierCategories.length} categories</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {showSupplierBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showSupplierBreakdown && (
                <CardContent>
                  <div className="space-y-6">
                    {report.supplierCategories.map((cat: any) => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Other Costs']} variant="outline">
                            {cat.category}
                          </Badge>
                          <span className="text-sm font-semibold">{formatSAR(cat.subtotal)}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left p-2 font-medium">Supplier</th>
                                <th className="text-right p-2 font-medium">Amount (HT)</th>
                                <th className="text-right p-2 font-medium">VAT</th>
                                <th className="text-right p-2 font-medium">Amount (TTC)</th>
                                <th className="text-right p-2 font-medium">Invoices</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.suppliers.map((sup: any) => (
                                <tr key={`${cat.category}-${sup.supplierId}`} className="border-b hover:bg-muted/20">
                                  <td className="p-2 font-medium">{sup.supplierName}</td>
                                  <td className="p-2 text-right font-mono">{formatSAR(sup.totalHT)}</td>
                                  <td className="p-2 text-right font-mono text-muted-foreground">{formatSAR(sup.totalVAT)}</td>
                                  <td className="p-2 text-right font-mono">{formatSAR(sup.totalTTC)}</td>
                                  <td className="p-2 text-right">{sup.invoiceCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Top Expense Items */}
          {report.topExpenseItems && report.topExpenseItems.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => setShowTopItems(!showTopItems)}>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Top Expense Items
                    <Badge variant="outline">{report.topExpenseItems.length} items</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {showTopItems ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showTopItems && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">#</th>
                          <th className="text-left p-3 font-medium">Item</th>
                          <th className="text-left p-3 font-medium">Ref</th>
                          <th className="text-left p-3 font-medium">Supplier</th>
                          <th className="text-right p-3 font-medium">Qty</th>
                          <th className="text-right p-3 font-medium">Amount (HT)</th>
                          <th className="text-right p-3 font-medium">Amount (TTC)</th>
                          <th className="text-right p-3 font-medium">Invoices</th>
                          <th className="text-right p-3 font-medium">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.topExpenseItems.slice(0, 30).map((item: any, idx: number) => (
                          <tr key={idx} className="border-b hover:bg-muted/30">
                            <td className="p-3 text-muted-foreground">{idx + 1}</td>
                            <td className="p-3 font-medium max-w-[200px] truncate" title={item.productLabel}>
                              {item.productLabel}
                            </td>
                            <td className="p-3 font-mono text-xs text-muted-foreground">{item.productRef || '—'}</td>
                            <td className="p-3">{item.supplierName}</td>
                            <td className="p-3 text-right">{item.totalQty.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono">{formatSAR(item.totalHT)}</td>
                            <td className="p-3 text-right font-mono">{formatSAR(item.totalTTC)}</td>
                            <td className="p-3 text-right">{item.invoiceCount}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-12 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(item.percentOfTotal, 100)}%` }} />
                                </div>
                                <span className="text-xs w-12 text-right">{formatPct(item.percentOfTotal)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
