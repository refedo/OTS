'use client';

import { useState, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, ArrowLeft, Printer, DollarSign, TrendingUp, TrendingDown,
  BarChart3, ChevronDown, ChevronUp,
  FileText, FolderOpen,
  Eye, CheckCircle, Clock, AlertTriangle, CreditCard,
} from 'lucide-react';
import Link from 'next/link';

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(amount);
}

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

function compact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `SAR ${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `SAR ${(amount / 1_000).toFixed(1)}K`;
  return fmt(amount);
}

const STATUS_BADGE: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'Open': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Closed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const CAT_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-cyan-500', 'bg-amber-500', 'bg-pink-500', 'bg-red-500',
  'bg-indigo-500', 'bg-slate-500',
];

export default function ProjectAnalysisPage() {
  const currentYear = new Date().getFullYear();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showMonthly, setShowMonthly] = useState(true);
  const [showCostBreakdown, setShowCostBreakdown] = useState(true);
  const [sortField, setSortField] = useState<string>('revenueHT');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [costBreakdownProject, setCostBreakdownProject] = useState<number | null>(null);

  const generate = async () => {
    setLoading(true);
    setSelectedProject(null);
    setDetail(null);
    try {
      let url = '/api/financial/reports/project-analysis';
      const params: string[] = [];
      if (fromDate) params.push(`from=${fromDate}`);
      if (toDate) params.push(`to=${toDate}`);
      if (params.length) url += '?' + params.join('&');
      const res = await fetch(url);
      if (res.ok) setReport(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadDetail = async (projectId: number) => {
    setSelectedProject(projectId);
    setDetailLoading(true);
    try {
      let url = `/api/financial/reports/project-analysis?projectId=${projectId}`;
      if (fromDate) url += `&from=${fromDate}`;
      if (toDate) url += `&to=${toDate}`;
      const res = await fetch(url);
      if (res.ok) setDetail(await res.json());
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const backToSummary = () => {
    setSelectedProject(null);
    setDetail(null);
  };

  const sortedProjects = report?.projects ? [...report.projects].sort((a: any, b: any) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  }) : [];

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: string }) => (
    sortField === field
      ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3 inline" /> : <ChevronUp className="h-3 w-3 inline" />)
      : null
  );

  const s = report?.summary || {};

  // ===================== DETAIL VIEW =====================
  if (selectedProject && detail?.mode === 'detail') {
    const p = detail.project;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={backToSummary}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Summary
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{p.projectRef} — {p.projectTitle}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={STATUS_BADGE[p.statusLabel] || STATUS_BADGE['Draft']}>{p.statusLabel}</Badge>
                <span className="text-muted-foreground">Client: <strong>{p.clientName}</strong></span>
                {p.dateStart && <span className="text-muted-foreground text-sm">Start: {p.dateStart}</span>}
                {p.dateEnd && <span className="text-muted-foreground text-sm">End: {p.dateEnd}</span>}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>

        {/* Project KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="border-green-200 dark:border-green-900/50">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Revenue</div>
              <div className="text-lg font-bold text-green-600">{compact(p.revenueHT)}</div>
              <div className="text-xs text-muted-foreground">{p.customerInvoiceCount} invoices</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-900/50">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Collected</div>
              <div className="text-lg font-bold text-blue-600">{compact(p.collected)}</div>
              <div className="text-xs text-muted-foreground">{pct(p.collectionRate)} rate</div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-900/50">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Outstanding</div>
              <div className="text-lg font-bold text-amber-600">{compact(p.outstanding)}</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-900/50">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Costs</div>
              <div className="text-lg font-bold text-red-600">{compact(p.costHT)}</div>
              <div className="text-xs text-muted-foreground">{p.supplierInvoiceCount} invoices</div>
            </CardContent>
          </Card>
          <Card className={`${p.profit >= 0 ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-red-200 dark:border-red-900/50'}`}>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Profit</div>
              <div className={`text-lg font-bold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{compact(p.profit)}</div>
              <div className="text-xs text-muted-foreground">{pct(p.marginPct)} margin</div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 dark:border-purple-900/50">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">Paid to Suppliers</div>
              <div className="text-lg font-bold text-purple-600">{compact(p.paidToSuppliers)}</div>
              <div className="text-xs text-muted-foreground">Payable: {compact(p.outstandingPayables)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Cost Categories */}
        {p.costCategories && p.costCategories.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Cost Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {p.costCategories.map((cat: any, idx: number) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{cat.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{fmt(cat.totalHT)}</span>
                        <span className="text-xs text-muted-foreground w-14 text-right">{pct(cat.percentOfCost)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full ${CAT_COLORS[idx % CAT_COLORS.length]}`} style={{ width: `${Math.max(cat.percentOfCost, 0.5)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trend */}
        {p.monthlyTrend && p.monthlyTrend.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Monthly Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-40 mb-4">
                {p.monthlyTrend.map((m: any) => {
                  const maxVal = Math.max(...p.monthlyTrend.map((t: any) => Math.max(t.revenue, t.cost)));
                  const revH = maxVal > 0 ? (m.revenue / maxVal) * 100 : 0;
                  const costH = maxVal > 0 ? (m.cost / maxVal) * 100 : 0;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="text-[9px] font-mono text-muted-foreground">{compact(m.profit)}</div>
                      <div className="w-full flex gap-0.5 items-end" style={{ height: '80%' }}>
                        <div className="flex-1 bg-green-500 rounded-t" style={{ height: `${revH}%`, minHeight: m.revenue > 0 ? '2px' : 0 }} title={`Revenue: ${fmt(m.revenue)}`} />
                        <div className="flex-1 bg-red-400 rounded-t" style={{ height: `${costH}%`, minHeight: m.cost > 0 ? '2px' : 0 }} title={`Cost: ${fmt(m.cost)}`} />
                      </div>
                      <div className="text-[9px] text-muted-foreground">{m.monthLabel}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 justify-center text-xs">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500" /> Revenue</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-400" /> Cost</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Invoices */}
        {detail.customerInvoices && detail.customerInvoices.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Customer Invoices <Badge variant="outline">{detail.customerInvoices.length}</Badge></CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Ref</th>
                      <th className="text-left p-2 font-medium">Client</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-right p-2 font-medium">HT</th>
                      <th className="text-right p-2 font-medium">TTC</th>
                      <th className="text-center p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.customerInvoices.map((inv: any) => (
                      <tr key={inv.dolibarrId} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-mono font-medium">{inv.ref}</td>
                        <td className="p-2">{inv.clientName}</td>
                        <td className="p-2 text-muted-foreground">{inv.dateInvoice}</td>
                        <td className="p-2 text-right font-mono">{fmt(inv.totalHT)}</td>
                        <td className="p-2 text-right font-mono">{fmt(inv.totalTTC)}</td>
                        <td className="p-2 text-center">
                          {inv.isPaid
                            ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>
                            : <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Unpaid</Badge>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Supplier Invoices */}
        {detail.supplierInvoices && detail.supplierInvoices.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-red-500" /> Supplier Invoices <Badge variant="outline">{detail.supplierInvoices.length}</Badge></CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Ref</th>
                      <th className="text-left p-2 font-medium">Supplier</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-right p-2 font-medium">HT</th>
                      <th className="text-right p-2 font-medium">TTC</th>
                      <th className="text-center p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.supplierInvoices.map((inv: any) => (
                      <tr key={inv.dolibarrId} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-mono font-medium">{inv.ref}</td>
                        <td className="p-2">{inv.supplierName}</td>
                        <td className="p-2 text-muted-foreground">{inv.dateInvoice}</td>
                        <td className="p-2 text-right font-mono">{fmt(inv.totalHT)}</td>
                        <td className="p-2 text-right font-mono">{fmt(inv.totalTTC)}</td>
                        <td className="p-2 text-center">
                          {inv.isPaid
                            ? <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>
                            : <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Unpaid</Badge>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments */}
        {detail.payments && detail.payments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payments <Badge variant="outline">{detail.payments.length}</Badge></CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Ref</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-left p-2 font-medium">Invoice</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Method</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.payments.map((p: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-mono">{p.ref}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={p.type === 'customer' ? 'text-green-600' : 'text-red-600'}>
                            {p.type === 'customer' ? 'Received' : 'Paid'}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono">{p.invoiceRef}</td>
                        <td className="p-2 text-muted-foreground">{p.date}</td>
                        <td className="p-2">{p.method || '—'}</td>
                        <td className="p-2 text-right font-mono font-semibold">{fmt(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ===================== SUMMARY VIEW =====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/financial">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Project Analysis Report</h1>
            <p className="text-muted-foreground mt-1">Comprehensive project P&L — revenue, costs, collections, and profitability per project</p>
          </div>
        </div>
        {report && (
          <Button variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        )}
      </div>

      {/* Date Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label>From Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>To Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FolderOpen className="h-4 w-4 mr-2" />}
              Generate Report
            </Button>
            {(fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>
                Clear Dates
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Leave dates empty to see all-time project data. Dates filter invoices and payments within the period.</p>
        </CardContent>
      </Card>

      {report && report.mode === 'summary' && (
        <>
          {/* Print Header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-bold">Project Analysis Report</h1>
            {report.fromDate && <p className="text-sm text-gray-500">Period: {report.fromDate} to {report.toDate}</p>}
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border-green-200 dark:border-green-900/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Revenue</span>
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                </div>
                <div className="text-xl font-bold text-green-600">{compact(s.totalRevenue)}</div>
                <div className="text-xs text-muted-foreground">{s.projectsWithRevenue} projects</div>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Costs</span>
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                </div>
                <div className="text-xl font-bold text-red-600">{compact(s.totalCosts)}</div>
                <div className="text-xs text-muted-foreground">{s.projectsWithCosts} projects</div>
              </CardContent>
            </Card>
            <Card className={`${s.totalProfit >= 0 ? 'border-emerald-200 dark:border-emerald-900/50' : 'border-red-200 dark:border-red-900/50'}`}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total Profit</span>
                  <DollarSign className={`h-3.5 w-3.5 ${s.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                </div>
                <div className={`text-xl font-bold ${s.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{compact(s.totalProfit)}</div>
                <div className="text-xs text-muted-foreground">{pct(s.overallMargin)} margin</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-900/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Collected</span>
                  <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="text-xl font-bold text-blue-600">{compact(s.totalCollected)}</div>
                <div className="text-xs text-muted-foreground">{pct(s.overallCollectionRate)} rate</div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Outstanding</span>
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="text-xl font-bold text-amber-600">{compact(s.totalOutstanding)}</div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 dark:border-purple-900/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Projects</span>
                  <FolderOpen className="h-3.5 w-3.5 text-purple-500" />
                </div>
                <div className="text-xl font-bold text-purple-600">{s.totalProjects}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="text-green-600">{s.profitableProjects} profitable</span>
                  {s.lossProjects > 0 && <span className="text-red-600 ml-1">· {s.lossProjects} loss</span>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aggregate Cost Breakdown */}
          {report.aggregateCostCategories && report.aggregateCostCategories.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => setShowCostBreakdown(!showCostBreakdown)}>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Aggregate Cost Breakdown</div>
                  {showCostBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {showCostBreakdown && (
                <CardContent>
                  <div className="space-y-2">
                    {report.aggregateCostCategories.map((cat: any, idx: number) => (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{cat.category}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{fmt(cat.totalHT)}</span>
                            <span className="text-xs text-muted-foreground w-14 text-right">{pct(cat.percentOfCost)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                          <div className={`h-full rounded-full ${CAT_COLORS[idx % CAT_COLORS.length]}`} style={{ width: `${Math.max(cat.percentOfCost, 0.5)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Unlinked Costs Warning */}
          {s.unlinkedCostsHT > 0 && (
            <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">Unlinked Supplier Costs</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong className="text-amber-600">{compact(s.unlinkedCostsHT)}</strong> ({s.unlinkedInvoiceCount} of {s.totalSupplierInvoices} supplier invoices)
                      are not linked to any project in Dolibarr. These costs do not appear in the per-project breakdown.
                      To fix this, link supplier invoices to projects in Dolibarr and re-sync.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aggregate Monthly Trend */}
          {report.aggregateMonthlyTrend && report.aggregateMonthlyTrend.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer select-none" onClick={() => setShowMonthly(!showMonthly)}>
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Monthly Revenue vs Cost</div>
                  {showMonthly ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {showMonthly && (
                <CardContent>
                  {/* Enhanced chart with value labels and gridlines */}
                  {(() => {
                    const data = report.aggregateMonthlyTrend;
                    const maxVal = Math.max(...data.map((t: any) => Math.max(t.revenue, t.cost)));
                    return (
                      <div className="space-y-2">
                        <div className="flex items-end gap-2 h-56 relative">
                          {/* Y-axis gridlines */}
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: '24px', top: '20px' }}>
                            {[100, 75, 50, 25, 0].map(pctLine => (
                              <div key={pctLine} className="flex items-center w-full">
                                <span className="text-[9px] text-muted-foreground w-12 text-right pr-1 shrink-0">{compact(maxVal * pctLine / 100)}</span>
                                <div className="flex-1 border-b border-dashed border-muted-foreground/20" />
                              </div>
                            ))}
                          </div>
                          {/* Bars */}
                          <div className="flex items-end gap-1 flex-1 ml-12" style={{ height: 'calc(100% - 24px)', paddingTop: '20px' }}>
                            {data.map((m: any) => {
                              const revH = maxVal > 0 ? (m.revenue / maxVal) * 100 : 0;
                              const costH = maxVal > 0 ? (m.cost / maxVal) * 100 : 0;
                              return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-0" style={{ minWidth: 0 }}>
                                  <div className={`text-[10px] font-mono font-semibold mb-0.5 ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {compact(m.profit)}
                                  </div>
                                  <div className="w-full flex gap-0.5 items-end flex-1">
                                    <div className="flex-1 flex flex-col items-center justify-end h-full">
                                      <div className="w-full bg-green-500 rounded-t transition-all" style={{ height: `${revH}%`, minHeight: m.revenue > 0 ? '3px' : 0 }} />
                                    </div>
                                    <div className="flex-1 flex flex-col items-center justify-end h-full">
                                      <div className="w-full bg-red-400 rounded-t transition-all" style={{ height: `${costH}%`, minHeight: m.cost > 0 ? '3px' : 0 }} />
                                    </div>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-1 font-medium">{m.monthLabel}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {/* Legend with totals */}
                        <div className="flex gap-6 justify-center text-xs pt-2 border-t">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-green-500" />
                            <span>Revenue</span>
                            <span className="font-semibold text-green-600 ml-1">{compact(data.reduce((s: number, m: any) => s + m.revenue, 0))}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-sm bg-red-400" />
                            <span>Cost</span>
                            <span className="font-semibold text-red-600 ml-1">{compact(data.reduce((s: number, m: any) => s + m.cost, 0))}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>Net Profit:</span>
                            <span className={`font-semibold ${data.reduce((s: number, m: any) => s + m.profit, 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {compact(data.reduce((s: number, m: any) => s + m.profit, 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              )}
            </Card>
          )}

          {/* Projects Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                All Projects
                <Badge variant="outline">{sortedProjects.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-1.5 font-medium whitespace-nowrap">Project</th>
                      <th className="text-left py-2 px-1.5 font-medium whitespace-nowrap">Client</th>
                      <th className="text-center py-2 px-1.5 font-medium whitespace-nowrap">Status</th>
                      <th className="text-right py-2 px-1.5 font-medium cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => toggleSort('revenueHT')}>
                        Revenue <SortIcon field="revenueHT" />
                      </th>
                      <th className="text-right py-2 px-1.5 font-medium cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => toggleSort('collected')}>
                        Collected <SortIcon field="collected" />
                      </th>
                      <th className="text-right py-2 px-1.5 font-medium cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => toggleSort('costHT')}>
                        Costs <SortIcon field="costHT" />
                      </th>
                      <th className="text-right py-2 px-1.5 font-medium cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => toggleSort('profit')}>
                        Profit <SortIcon field="profit" />
                      </th>
                      <th className="text-right py-2 px-1.5 font-medium cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => toggleSort('marginPct')}>
                        Margin <SortIcon field="marginPct" />
                      </th>
                      <th className="text-right py-2 px-1.5 font-medium cursor-pointer hover:text-primary whitespace-nowrap" onClick={() => toggleSort('collectionRate')}>
                        Collection <SortIcon field="collectionRate" />
                      </th>
                      <th className="text-center py-2 px-1.5 font-medium print:hidden whitespace-nowrap">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProjects.map((p: any) => (
                      <Fragment key={p.projectId}>
                        <tr key={p.projectId} className="border-b hover:bg-muted/30">
                          <td className="py-1.5 px-1.5">
                            <div className="font-medium text-xs">{p.projectRef}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={p.projectTitle}>{p.projectTitle}</div>
                          </td>
                          <td className="py-1.5 px-1.5 text-muted-foreground max-w-[120px] truncate" title={p.clientName}>
                            {p.clientName !== 'No Client' ? p.clientName : <span className="text-muted-foreground/50 italic">—</span>}
                          </td>
                          <td className="py-1.5 px-1.5 text-center">
                            <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_BADGE[p.statusLabel] || STATUS_BADGE['Draft']}`}>{p.statusLabel}</Badge>
                          </td>
                          <td className="py-1.5 px-1.5 text-right font-mono text-green-600">{p.revenueHT > 0 ? compact(p.revenueHT) : <span className="text-muted-foreground">—</span>}</td>
                          <td className="py-1.5 px-1.5 text-right font-mono text-blue-600">{p.collected > 0 ? compact(p.collected) : <span className="text-muted-foreground">—</span>}</td>
                          <td className="py-1.5 px-1.5 text-right font-mono">
                            {p.costHT > 0 ? (
                              <button
                                className="text-red-600 hover:text-red-800 hover:underline cursor-pointer font-mono"
                                onClick={() => setCostBreakdownProject(costBreakdownProject === p.projectId ? null : p.projectId)}
                                title="Click to see cost breakdown"
                              >
                                {compact(p.costHT)}
                              </button>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className={`py-1.5 px-1.5 text-right font-mono font-semibold ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {(p.revenueHT > 0 || p.costHT > 0) ? compact(p.profit) : <span className="text-muted-foreground font-normal">—</span>}
                          </td>
                          <td className={`py-1.5 px-1.5 text-right ${p.marginPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {p.revenueHT > 0 ? pct(p.marginPct) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-1.5 px-1.5 text-right">
                            {p.revenueTTC > 0 ? (
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-8 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(p.collectionRate, 100)}%` }} />
                                </div>
                                <span className="text-[10px] w-8 text-right">{pct(p.collectionRate)}</span>
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-1.5 px-1.5 text-center print:hidden">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => loadDetail(p.projectId)}>
                              {detailLoading && selectedProject === p.projectId
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Eye className="h-3 w-3" />
                              }
                            </Button>
                          </td>
                        </tr>
                        {/* Inline Cost Breakdown */}
                        {costBreakdownProject === p.projectId && p.costCategories && p.costCategories.length > 0 && (
                          <tr key={`${p.projectId}-cost`} className="bg-red-50/50 dark:bg-red-900/10">
                            <td colSpan={10} className="py-2 px-3">
                              <div className="text-xs font-medium mb-1.5 flex items-center gap-1">
                                <BarChart3 className="h-3 w-3 text-red-500" />
                                Cost Breakdown — {p.projectRef}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                                {p.costCategories.map((cat: any, idx: number) => (
                                  <div key={cat.category} className="flex items-center gap-1.5 text-[11px]">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${CAT_COLORS[idx % CAT_COLORS.length]}`} />
                                    <span className="truncate">{cat.category}</span>
                                    <span className="font-mono font-semibold text-red-600 ml-auto">{compact(cat.totalHT)}</span>
                                    <span className="text-muted-foreground w-8 text-right">{pct(cat.percentOfCost)}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {/* Totals Row */}
                    <tr className="border-t-2 font-bold bg-muted/50 text-xs">
                      <td className="py-2 px-1.5" colSpan={3}>Total ({sortedProjects.length} projects)</td>
                      <td className="py-2 px-1.5 text-right font-mono text-green-700">{compact(s.totalRevenue)}</td>
                      <td className="py-2 px-1.5 text-right font-mono text-blue-700">{compact(s.totalCollected)}</td>
                      <td className="py-2 px-1.5 text-right font-mono text-red-700">{compact(s.totalCosts)}</td>
                      <td className={`py-2 px-1.5 text-right font-mono ${s.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{compact(s.totalProfit)}</td>
                      <td className={`py-2 px-1.5 text-right ${s.overallMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{pct(s.overallMargin)}</td>
                      <td className="py-2 px-1.5 text-right">{pct(s.overallCollectionRate)}</td>
                      <td className="py-2 px-1.5 print:hidden"></td>
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
