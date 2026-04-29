'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Search, Loader2, Building2, DollarSign, CreditCard,
  TrendingUp, TrendingDown, FolderOpen, FileText, ChevronDown, ChevronUp,
  BarChart3, CalendarClock, ArrowUpDown, Truck, Receipt, Clock,
  FileSpreadsheet, BookOpen, List, Layers, Settings, Banknote, Wallet,
  Package, Users,
} from 'lucide-react';
import Link from 'next/link';

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatSAR(n: number) {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(n);
}

function formatPct(n: number) {
  return `${n.toFixed(1)}%`;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const REPORT_LINKS = [
  { href: '/financial',                                        icon: BarChart3,       label: 'Financial Dashboard' },
  { href: '/financial/reports/monthly-report',                 icon: CalendarClock,   label: 'Monthly Report' },
  { href: '/financial/reports/income-statement',               icon: TrendingUp,      label: 'Income Statement' },
  { href: '/financial/reports/cash-flow',                      icon: ArrowUpDown,     label: 'Cash In / Out' },
  { href: '/financial/reports/expenses-analysis',              icon: TrendingDown,    label: 'Expenses Analysis' },
  { href: '/financial/reports/expenses-by-account',            icon: FileSpreadsheet, label: 'Expenses by Account' },
  { href: '/financial/reports/salaries',                       icon: Users,           label: 'Salaries & Wages' },
  { href: '/financial/reports/trial-balance',                  icon: FileSpreadsheet, label: 'Trial Balance' },
  { href: '/financial/reports/balance-sheet',                  icon: Building2,       label: 'Balance Sheet' },
  { href: '/financial/reports/vat',                            icon: Receipt,         label: 'VAT Report' },
  { href: '/financial/reports/aging',                          icon: Clock,           label: 'Aging Report' },
  { href: '/financial/reports/soa',                            icon: FileText,        label: 'Statement of Account' },
  { href: '/financial/reports/cash-flow-forecast',             icon: TrendingUp,      label: 'Cash Flow Forecast' },
  { href: '/financial/reports/payment-schedule',               icon: CalendarClock,   label: 'Payment Schedule' },
  { href: '/financial/reports/project-analysis',               icon: FolderOpen,      label: 'Project Analysis' },
  { href: '/financial/reports/wip',                            icon: Wallet,          label: 'WIP Report' },
  { href: '/financial/reports/projects-dashboard',             icon: Banknote,        label: 'Projects Financial' },
  { href: '/financial/reports/project-cost-structure',         icon: Package,         label: 'Cost Structure' },
  { href: '/financial/reports/supplier-invoice-report',        icon: Truck,           label: 'Supplier Invoice Report', active: true },
  { href: '/financial/reports/cogs-supplier-map',              icon: Layers,          label: 'COGS Supplier Map' },
  { href: '/financial/reports/ots-journal-entries',            icon: BookOpen,        label: 'OTS Journal Entries' },
  { href: '/financial/journal-entries',                        icon: List,            label: 'Journal Entries' },
  { href: '/financial/chart-of-accounts',                      icon: FileText,        label: 'Chart of Accounts' },
  { href: '/financial/product-coa-mapping',                    icon: Layers,          label: 'Cost Classification' },
  { href: '/financial/settings',                               icon: Settings,        label: 'Settings' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Payment {
  amount: number;
  date: string | null;
  method: string | null;
  ref: string | null;
}

interface Invoice {
  id: number;
  ref: string;
  refSupplier: string | null;
  dateInvoice: string | null;
  dateDue: string | null;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  isPaid: boolean;
  projectId: number | null;
  projectRef: string | null;
  projectTitle: string | null;
  payments: Payment[];
  totalPaid: number;
  balance: number;
}

interface ProjectSummary {
  projectId: number | null;
  projectRef: string;
  projectTitle: string;
  invoiceCount: number;
  totalHT: number;
  totalTTC: number;
  totalPaid: number;
  balance: number;
  projectTotalCost: number;
  pctOfProjectCost: number;
}

interface ReportData {
  supplier: { id: number; name: string; code: string | null; email: string | null; phone: string | null; town: string | null };
  period: { from: string; to: string };
  summary: {
    invoiceCount: number;
    totalInvoicedHT: number;
    totalInvoicedTTC: number;
    totalPaid: number;
    totalBalance: number;
    pctOfGrandTotal: number;
    grandTotalCost: number;
  };
  projectSummary: ProjectSummary[];
  invoices: Invoice[];
}

interface SupplierSuggestion {
  id: number;
  name: string;
  code: string | null;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: 'blue' | 'green' | 'red' | 'amber' | 'violet' }) {
  const ring: Record<string, string> = {
    blue: 'border-l-blue-500',
    green: 'border-l-emerald-500',
    red: 'border-l-red-500',
    amber: 'border-l-amber-500',
    violet: 'border-l-violet-500',
  };
  return (
    <div className={`rounded-xl border border-l-4 bg-white px-5 py-4 shadow-sm ${ring[color]}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SupplierInvoiceReportPage() {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<SupplierSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSuggestion | null>(null);
  const [searching, setSearching] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(new Set());

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/financial/reports/supplier-invoice-report/suppliers?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suppliers ?? []);
        setSuggestionsOpen(true);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setSelectedSupplier(null);
    fetchSuggestions(val);
  };

  const handleSelect = (s: SupplierSuggestion) => {
    setSelectedSupplier(s);
    setSearch(s.name);
    setSuggestionsOpen(false);
  };

  const handleGenerate = async () => {
    if (!selectedSupplier) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const params = new URLSearchParams({ supplierId: String(selectedSupplier.id) });
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const res = await fetch(`/api/financial/reports/supplier-invoice-report?${params}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to load report'); return; }
      setReport(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (key: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleInvoice = (id: number) => {
    setExpandedInvoices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r bg-white p-3 gap-0.5 overflow-y-auto">
        <div className="mb-3 px-2">
          <Link href="/financial" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Financial
          </Link>
        </div>
        {REPORT_LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                l.active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-6 m-4 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Supplier Invoice Report</h1>
              <p className="text-blue-100 text-sm mt-0.5">
                Invoices &amp; payments for a supplier — distribution out of project cost
              </p>
            </div>
          </div>

          {/* Search & date controls */}
          <div className="mt-5 flex flex-wrap gap-3 items-end">
            {/* Supplier search */}
            <div className="relative flex-1 min-w-[220px]">
              <label className="block text-xs text-white/70 mb-1">Supplier</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search supplier name or code…"
                  className="pl-9 bg-white text-slate-800"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
                  onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
              </div>
              {suggestionsOpen && suggestions.length > 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                      onMouseDown={() => handleSelect(s)}
                    >
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">{s.name}</span>
                      {s.code && <span className="text-xs text-slate-400 ml-auto">{s.code}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date range */}
            <div>
              <label className="block text-xs text-white/70 mb-1">From</label>
              <Input type="date" className="bg-white text-slate-800 w-36" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">To</label>
              <Input type="date" className="bg-white text-slate-800 w-36" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <Button
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shrink-0"
              onClick={handleGenerate}
              disabled={!selectedSupplier || loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <BarChart3 className="h-4 w-4 mr-1.5" />}
              Generate Report
            </Button>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-5">
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          )}

          {/* Report */}
          {report && !loading && (
            <>
              {/* Supplier info */}
              <div className="rounded-xl border bg-white p-4 flex flex-wrap gap-4 items-center shadow-sm">
                <div className="rounded-full bg-blue-100 p-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{report.supplier.name}</p>
                  <p className="text-sm text-slate-500 flex flex-wrap gap-3 mt-0.5">
                    {report.supplier.code && <span>Code: <strong>{report.supplier.code}</strong></span>}
                    {report.supplier.town && <span>📍 {report.supplier.town}</span>}
                    {report.supplier.email && <span>✉ {report.supplier.email}</span>}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-400">Period</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(report.period.from)} → {formatDate(report.period.to)}
                  </p>
                </div>
              </div>

              {/* KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiCard
                  label="Total Invoiced (excl. VAT)"
                  value={formatSAR(report.summary.totalInvoicedHT)}
                  sub={`${report.summary.invoiceCount} invoice${report.summary.invoiceCount !== 1 ? 's' : ''}`}
                  color="blue"
                />
                <KpiCard
                  label="Total Paid"
                  value={formatSAR(report.summary.totalPaid)}
                  sub={`${formatPct((report.summary.totalPaid / Math.max(report.summary.totalInvoicedTTC, 1)) * 100)} of invoiced`}
                  color="green"
                />
                <KpiCard
                  label="Outstanding Balance"
                  value={formatSAR(report.summary.totalBalance)}
                  sub="unpaid (incl. VAT)"
                  color={report.summary.totalBalance > 0 ? 'red' : 'green'}
                />
                <KpiCard
                  label="% of Total Supplier Cost"
                  value={formatPct(report.summary.pctOfGrandTotal)}
                  sub={`vs ${formatSAR(report.summary.grandTotalCost)} grand total`}
                  color="violet"
                />
              </div>

              {/* Global progress bar */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700">Share of Total Supplier Cost</p>
                  <span className="text-sm font-bold text-blue-700">{formatPct(report.summary.pctOfGrandTotal)}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                    style={{ width: `${Math.min(report.summary.pctOfGrandTotal, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {formatSAR(report.summary.totalInvoicedHT)} of {formatSAR(report.summary.grandTotalCost)} total supplier spend in period
                </p>
              </div>

              {/* Per-project breakdown */}
              {report.projectSummary.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-violet-600" />
                      Distribution by Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {report.projectSummary.map((proj) => {
                        const key = proj.projectId ? String(proj.projectId) : '__no_project__';
                        const expanded = expandedProjects.has(key);
                        const projectInvoices = report.invoices.filter((inv) =>
                          proj.projectId ? inv.projectId === proj.projectId : inv.projectId === null
                        );
                        return (
                          <div key={key}>
                            <button
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                              onClick={() => toggleProject(key)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-slate-800">
                                    {proj.projectRef !== 'No Project' ? proj.projectRef : '— No Project —'}
                                  </span>
                                  {proj.projectTitle && proj.projectTitle !== 'No Project' && proj.projectTitle !== proj.projectRef && (
                                    <span className="text-xs text-slate-500 truncate">{proj.projectTitle}</span>
                                  )}
                                  <Badge variant="outline" className="text-xs">{proj.invoiceCount} invoices</Badge>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-1.5 flex items-center gap-2">
                                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-blue-500"
                                      style={{ width: `${Math.min(proj.pctOfProjectCost, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold text-blue-700 w-12 text-right">
                                    {formatPct(proj.pctOfProjectCost)}
                                  </span>
                                </div>
                                {proj.projectTotalCost > 0 && (
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    of {formatSAR(proj.projectTotalCost)} project cost
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-sm font-bold text-slate-800">{formatSAR(proj.totalHT)}</p>
                                <p className="text-xs text-slate-400">excl. VAT</p>
                                {proj.balance > 0.01 && (
                                  <p className="text-xs text-red-600 font-medium">
                                    {formatSAR(proj.balance)} due
                                  </p>
                                )}
                              </div>
                              {expanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                            </button>

                            {/* Expanded invoice list for this project */}
                            {expanded && (
                              <div className="bg-slate-50 border-t divide-y">
                                {projectInvoices.map((inv) => {
                                  const invExpanded = expandedInvoices.has(inv.id);
                                  return (
                                    <div key={inv.id} className="px-6 py-2">
                                      <button
                                        className="w-full flex items-center gap-3 text-left hover:opacity-80"
                                        onClick={() => toggleInvoice(inv.id)}
                                      >
                                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-slate-700">{inv.ref}</span>
                                            {inv.refSupplier && (
                                              <span className="text-xs text-slate-400">({inv.refSupplier})</span>
                                            )}
                                            <Badge
                                              className={`text-xs border-0 ${inv.isPaid ? 'bg-emerald-100 text-emerald-700' : inv.balance > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                              {inv.isPaid ? 'Paid' : inv.balance > 0 ? 'Outstanding' : 'Open'}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-slate-400">
                                            {formatDate(inv.dateInvoice)}
                                            {inv.dateDue && ` · Due ${formatDate(inv.dateDue)}`}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-sm font-semibold text-slate-700">{formatSAR(inv.totalHT)}</p>
                                          {inv.totalPaid > 0 && (
                                            <p className="text-xs text-emerald-600">Paid: {formatSAR(inv.totalPaid)}</p>
                                          )}
                                          {inv.balance > 0.01 && (
                                            <p className="text-xs text-red-500">Due: {formatSAR(inv.balance)}</p>
                                          )}
                                        </div>
                                        {invExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                      </button>

                                      {/* Payment details */}
                                      {invExpanded && inv.payments.length > 0 && (
                                        <div className="ml-7 mt-2 space-y-1 mb-2">
                                          {inv.payments.map((p, pi) => (
                                            <div key={pi} className="flex items-center gap-3 text-xs text-slate-600 bg-white rounded-lg px-3 py-1.5 border">
                                              <CreditCard className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                              <span className="font-medium">{formatSAR(p.amount)}</span>
                                              {p.date && <span className="text-slate-400">{formatDate(p.date)}</span>}
                                              {p.method && <span className="text-slate-400">· {p.method}</span>}
                                              {p.ref && <span className="text-slate-400 ml-auto">{p.ref}</span>}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {invExpanded && inv.payments.length === 0 && (
                                        <p className="ml-7 mt-1 mb-2 text-xs text-slate-400">No payments recorded.</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary totals footer */}
              <div className="rounded-xl border bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 flex flex-wrap gap-6 shadow">
                <div>
                  <p className="text-xs text-slate-300">Total Invoiced (excl. VAT)</p>
                  <p className="text-lg font-bold">{formatSAR(report.summary.totalInvoicedHT)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-300">Total Invoiced (incl. VAT)</p>
                  <p className="text-lg font-bold">{formatSAR(report.summary.totalInvoicedTTC)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-300">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-300">{formatSAR(report.summary.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-300">Outstanding</p>
                  <p className={`text-lg font-bold ${report.summary.totalBalance > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                    {formatSAR(report.summary.totalBalance)}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-300">Share of Total Cost</p>
                  <p className="text-2xl font-black text-blue-300">{formatPct(report.summary.pctOfGrandTotal)}</p>
                </div>
              </div>
            </>
          )}

          {!report && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Truck className="h-14 w-14 mb-4 opacity-25" />
              <p className="font-medium text-slate-500">Select a supplier and generate the report</p>
              <p className="text-sm mt-1">Search by supplier name or code, then click Generate Report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
