'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Building2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, ArrowRight, BarChart3,
  FileText, Receipt, Clock, Package, FolderOpen, Wallet,
  FileSpreadsheet, BookOpen, List, Layers, Settings, Banknote,
  CalendarClock, ArrowUpDown, Truck, Loader2, ArrowLeft, CreditCard,
} from 'lucide-react';
import Link from 'next/link';

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatSAR(amount: number): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency', currency: 'SAR', minimumFractionDigits: 2,
  }).format(amount);
}

function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}SAR ${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}SAR ${(abs / 1_000).toFixed(1)}K`;
  return `${sign}SAR ${abs.toFixed(0)}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Sidebar nav data ──────────────────────────────────────────────────────────

const REPORT_LINKS = [
  { href: '/financial',                                      icon: BarChart3,      label: 'Financial Dashboard' },
  { href: '/financial/reports/monthly-report',               icon: CalendarClock,  label: 'Monthly Report',      active: true },
  { href: '/financial/reports/income-statement',             icon: TrendingUp,     label: 'Income Statement' },
  { href: '/financial/reports/cash-flow',                    icon: ArrowUpDown,    label: 'Cash In / Out' },
  { href: '/financial/reports/expenses-analysis',            icon: TrendingDown,   label: 'Expenses Analysis' },
  { href: '/financial/reports/expenses-by-account',          icon: FileSpreadsheet,label: 'Expenses by Account' },
  { href: '/financial/reports/salaries',                     icon: Users,          label: 'Salaries & Wages' },
  { href: '/financial/reports/trial-balance',                icon: FileSpreadsheet,label: 'Trial Balance' },
  { href: '/financial/reports/balance-sheet',                icon: Building2,      label: 'Balance Sheet' },
  { href: '/financial/reports/vat',                          icon: Receipt,        label: 'VAT Report' },
  { href: '/financial/reports/aging',                        icon: Clock,          label: 'Aging Report' },
  { href: '/financial/reports/soa',                          icon: FileText,       label: 'Statement of Account' },
  { href: '/financial/reports/cash-flow-forecast',           icon: TrendingUp,     label: 'Cash Flow Forecast' },
  { href: '/financial/reports/payment-schedule',             icon: CalendarClock,  label: 'Payment Schedule' },
  { href: '/financial/reports/project-analysis',             icon: FolderOpen,     label: 'Project Analysis' },
  { href: '/financial/reports/wip',                          icon: Wallet,         label: 'WIP Report' },
  { href: '/financial/reports/projects-dashboard',           icon: Banknote,       label: 'Projects Financial' },
  { href: '/financial/reports/project-cost-structure',       icon: Package,        label: 'Cost Structure' },
  { href: '/financial/reports/cogs-supplier-map',            icon: Layers,         label: 'COGS Supplier Map' },
  { href: '/financial/reports/ots-journal-entries',          icon: BookOpen,       label: 'OTS Journal Entries' },
  { href: '/financial/journal-entries',                      icon: List,           label: 'Journal Entries' },
  { href: '/financial/chart-of-accounts',                    icon: FileText,       label: 'Chart of Accounts' },
  { href: '/financial/product-coa-mapping',                  icon: Layers,         label: 'Cost Classification' },
  { href: '/financial/settings',                             icon: Settings,       label: 'Settings' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntityRow {
  entityName: string;
  totalAmount: number;
  paymentCount: number;
  invoiceCount: number;
}

interface SalaryRow {
  label: string;
  ref: string;
  amount: number;
  isPaid: boolean;
}

interface DrillPayment {
  ref: string;
  date: string | null;
  amount: number;
  method: string | null;
}

interface DrillInvoice {
  invoiceRef: string;
  invoiceSupplierRef: string | null;
  invoiceDate: string | null;
  invoiceAmount: number;
  payments: DrillPayment[];
}

interface DrillState {
  entityName: string;
  type: 'customer' | 'supplier';
}

interface ReportData {
  year: number;
  month: number;
  income: EntityRow[];
  expenses: EntityRow[];
  salaries: SalaryRow[];
  totals: {
    totalIncome: number;
    totalSupplier: number;
    totalSalaries: number;
    totalExpenses: number;
    grossProfit: number;
    netProfit: number;
    netMarginPct: number;
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiTile({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  color: 'green' | 'red' | 'blue' | 'amber';
  trend?: 'up' | 'down' | 'neutral';
}) {
  const colors = {
    green: {
      border: 'border-green-200 dark:border-green-900/50',
      icon:   'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      value:  'text-green-600 dark:text-green-400',
      glow:   'from-green-50 to-transparent dark:from-green-950/20',
    },
    red: {
      border: 'border-red-200 dark:border-red-900/50',
      icon:   'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      value:  'text-red-600 dark:text-red-400',
      glow:   'from-red-50 to-transparent dark:from-red-950/20',
    },
    blue: {
      border: 'border-blue-200 dark:border-blue-900/50',
      icon:   'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      value:  'text-blue-600 dark:text-blue-400',
      glow:   'from-blue-50 to-transparent dark:from-blue-950/20',
    },
    amber: {
      border: 'border-amber-200 dark:border-amber-900/50',
      icon:   'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      value:  'text-amber-600 dark:text-amber-400',
      glow:   'from-amber-50 to-transparent dark:from-amber-950/20',
    },
  }[color];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <Card className={`relative overflow-hidden ${colors.border} transition-all hover:shadow-md`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.glow} pointer-events-none`} />
      <CardContent className="pt-5 pb-4 relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${colors.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
          {TrendIcon && (
            <TrendIcon className={`h-4 w-4 ${color === 'green' ? 'text-green-500' : color === 'red' ? 'text-red-500' : 'text-blue-500'} opacity-60`} />
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-2xl font-bold ${colors.value} leading-tight`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── DrillDown Panel ─────────────────────────────────────────────────────────

function DrillDownPanel({
  loading,
  invoices: initialInvoices,
  accentColor,
  entityType,
}: {
  loading: boolean;
  invoices: DrillInvoice[] | null;
  accentColor: 'green' | 'red';
  entityType: 'customer' | 'supplier';
}) {
  const [invoices, setInvoices] = useState<DrillInvoice[] | null>(initialInvoices);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { setInvoices(initialInvoices); }, [initialInvoices]);

  const deletePayment = async (ref: string) => {
    if (!confirm(`Remove payment ${ref} from OTS? This only removes it from the local database — it will not be re-synced unless it still exists in Dolibarr.`)) return;
    setDeleting(ref);
    try {
      const res = await fetch('/api/financial/payments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refs: [ref], type: entityType }),
      });
      if (res.ok) {
        setInvoices(prev => prev ? prev.map(inv => ({
          ...inv,
          payments: inv.payments.filter(p => p.ref !== ref),
        })).filter(inv => inv.payments.length > 0) : prev);
      }
    } finally {
      setDeleting(null);
    }
  };

  const bg    = accentColor === 'green' ? 'bg-green-50/80 dark:bg-green-950/20'  : 'bg-red-50/80 dark:bg-red-950/20';
  const text  = accentColor === 'green' ? 'text-green-700 dark:text-green-300'   : 'text-red-700 dark:text-red-300';
  const badge = accentColor === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';

  if (loading) {
    return (
      <div className={`px-6 py-4 ${bg} border-t flex items-center gap-2`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading details…</span>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className={`px-6 py-4 ${bg} border-t`}>
        <p className="text-xs text-muted-foreground">No invoice details found.</p>
      </div>
    );
  }

  return (
    <div className={`${bg} border-t divide-y divide-black/5`}>
      {invoices.map(inv => (
        <div key={inv.invoiceRef} className="px-6 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold font-mono px-2 py-0.5 rounded ${badge}`}>
                {inv.invoiceRef}
              </span>
              {inv.invoiceSupplierRef && (
                <span className="text-xs text-muted-foreground font-mono">
                  ({inv.invoiceSupplierRef})
                </span>
              )}
              {inv.invoiceDate && (
                <span className="text-xs text-muted-foreground">{inv.invoiceDate}</span>
              )}
            </div>
            <span className={`text-xs font-bold tabular-nums shrink-0 ${text}`}>
              {formatSAR(inv.invoiceAmount)}
            </span>
          </div>
          <div className="space-y-1 pl-2 border-l-2 border-black/10">
            {inv.payments.map((pmt, pi) => (
              <div key={pi} className="flex items-center justify-between gap-3 group/pmt">
                <div className="flex items-center gap-1.5 min-w-0">
                  <CreditCard className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-mono text-muted-foreground">{pmt.ref}</span>
                  {pmt.date && (
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">· {pmt.date}</span>
                  )}
                  {pmt.method && (
                    <span className="text-[11px] text-muted-foreground capitalize hidden sm:inline">· {pmt.method}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {formatSAR(pmt.amount)}
                  </span>
                  <button
                    onClick={() => deletePayment(pmt.ref)}
                    disabled={deleting === pmt.ref}
                    title="Remove this payment from OTS (use when deleted in Dolibarr)"
                    className="opacity-0 group-hover/pmt:opacity-100 transition-opacity text-[10px] font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-1.5 py-0.5 rounded disabled:opacity-50"
                  >
                    {deleting === pmt.ref ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MonthlyFinancialReportPage() {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [toYear, setToYear]   = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [incomeSearch,  setIncomeSearch]  = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [salarySearch,  setSalarySearch]  = useState('');
  const [drillDown,     setDrillDown]     = useState<DrillState | null>(null);
  const [drillData,     setDrillData]     = useState<DrillInvoice[] | null>(null);
  const [drillLoading,  setDrillLoading]  = useState(false);
  const [incomeOpen,    setIncomeOpen]    = useState(true);
  const [expenseOpen,   setExpenseOpen]   = useState(true);

  const yearOptions = Array.from({ length: 10 }, (_, i) => now.getFullYear() - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/financial/reports/monthly-report?year=${year}&month=${month}&toYear=${toYear}&toMonth=${toMonth}`);
      if (res.ok) setData(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [year, month, toYear, toMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDrill = useCallback(async (entityName: string, type: 'customer' | 'supplier') => {
    if (drillDown?.entityName === entityName && drillDown.type === type) {
      setDrillDown(null);
      setDrillData(null);
      return;
    }
    setDrillDown({ entityName, type });
    setDrillData(null);
    setDrillLoading(true);
    try {
      const params = new URLSearchParams({
        type, entityName,
        year: year.toString(), month: month.toString(),
        toYear: toYear.toString(), toMonth: toMonth.toString(),
      });
      const res = await fetch(`/api/financial/reports/monthly-report/detail?${params}`);
      if (res.ok) {
        const json = await res.json();
        setDrillData(json.invoices || []);
      }
    } catch { /* silent */ }
    finally { setDrillLoading(false); }
  }, [drillDown, year, month, toYear, toMonth]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y: number) => y - 1); }
    else setMonth((m: number) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y: number) => y + 1); }
    else setMonth((m: number) => m + 1);
  };

  const filteredIncome   = (data?.income   || []).filter(r => r.entityName.toLowerCase().includes(incomeSearch.toLowerCase()));
  const filteredExpenses = (data?.expenses  || []).filter(r => r.entityName.toLowerCase().includes(expenseSearch.toLowerCase()));
  const filteredSalaries = (data?.salaries  || []).filter(r => r.label.toLowerCase().includes(salarySearch.toLowerCase()));

  const t = data?.totals;
  const maxIncome  = Math.max(...(data?.income?.map(r => r.totalAmount)  || [1]), 1);
  const maxExpense = Math.max(...(data?.expenses?.map(r => r.totalAmount) || [1]), 1);
  const maxSalary  = Math.max(...(data?.salaries?.map(r => r.amount)      || [1]), 1);

  return (
    <div className="flex gap-0 min-h-screen">
      {/* ── Left Sidebar ───────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r bg-muted/30 dark:bg-muted/10 sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 py-5 border-b">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Financial Reports</p>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {REPORT_LINKS.map(link => {
            const Icon = link.icon;
            const isActive = (link as { active?: boolean }).active;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href="/financial">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Monthly Financial Report</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {year === toYear && month === toMonth
                  ? `Income & expenses for ${MONTH_NAMES[month - 1]} ${year}`
                  : `Income & expenses from ${MONTH_NAMES[month - 1]} ${year} to ${MONTH_NAMES[toMonth - 1]} ${toYear}`}
              </p>
            </div>
          </div>

          {/* Month / Year navigation */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground font-medium">From</span>
            <Select value={month.toString()} onValueChange={v => setMonth(Number(v))}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year.toString()} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground font-medium">To</span>
            <Select value={toMonth.toString()} onValueChange={v => setToMonth(Number(v))}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={toYear.toString()} onValueChange={v => setToYear(Number(v))}>
              <SelectTrigger className="w-[90px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── KPI Tiles ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiTile
                label="Total Income"
                value={formatCompact(t?.totalIncome || 0)}
                sub={formatSAR(t?.totalIncome || 0)}
                icon={TrendingUp}
                color="green"
                trend="up"
              />
              <KpiTile
                label="Supplier Payments"
                value={formatCompact(t?.totalSupplier || 0)}
                sub={formatSAR(t?.totalSupplier || 0)}
                icon={Truck}
                color="red"
                trend="down"
              />
              <KpiTile
                label="Gross Profit"
                value={formatCompact(t?.grossProfit || 0)}
                sub={`Income − Suppliers`}
                icon={BarChart3}
                color={(t?.grossProfit || 0) >= 0 ? 'blue' : 'red'}
                trend={(t?.grossProfit || 0) >= 0 ? 'up' : 'down'}
              />
              <KpiTile
                label="Salaries & Wages"
                value={formatCompact(t?.totalSalaries || 0)}
                sub={`${data?.salaries?.length || 0} records`}
                icon={Users}
                color="amber"
              />
              <KpiTile
                label="Net Profit"
                value={formatCompact(t?.netProfit || 0)}
                sub={`Margin: ${(t?.netMarginPct || 0).toFixed(1)}%`}
                icon={DollarSign}
                color={(t?.netProfit || 0) >= 0 ? 'blue' : 'red'}
                trend={(t?.netProfit || 0) >= 0 ? 'up' : 'down'}
              />
            </div>

            {/* ── Side-by-side Income vs Expenses ─────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* ── Income Column ────────────────────────────────────────── */}
              <Card className="border-green-200 dark:border-green-900/50 flex flex-col">
                {/* Card Header */}
                <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 rounded-t-xl border-b border-green-100 dark:border-green-900/40">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      Income — Clients
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-0">
                        {formatCompact(t?.totalIncome || 0)}
                      </Badge>
                      <button onClick={() => setIncomeOpen(o => !o)} className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                        {incomeOpen ? <ChevronUp className="h-4 w-4 text-green-600 dark:text-green-400" /> : <ChevronDown className="h-4 w-4 text-green-600 dark:text-green-400" />}
                      </button>
                    </div>
                  </div>
                  {incomeOpen && (
                    <div className="relative mt-2">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search clients…"
                        value={incomeSearch}
                        onChange={e => setIncomeSearch(e.target.value)}
                        className="pl-8 h-8 text-sm bg-white/80 dark:bg-background/50 border-green-200 dark:border-green-900/50 focus-visible:ring-green-400"
                      />
                    </div>
                  )}
                </CardHeader>

                {incomeOpen && <CardContent className="flex-1 p-0">
                  {filteredIncome.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <TrendingUp className="h-10 w-10 mb-3 opacity-20" />
                      <p className="text-sm">No income records for this period</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredIncome.map((row, idx) => {
                        const isOpen = drillDown?.entityName === row.entityName && drillDown.type === 'customer';
                        return (
                          <div key={idx}>
                            <button
                              onClick={() => openDrill(row.entityName, 'customer')}
                              className="w-full px-5 py-3.5 hover:bg-green-50/50 dark:hover:bg-green-950/10 transition-colors text-left"
                            >
                              <div className="flex items-start justify-between gap-3 mb-1.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 text-green-600 dark:text-green-400 font-semibold text-xs">
                                    {row.entityName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate" title={row.entityName}>{row.entityName}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {row.paymentCount} payment{row.paymentCount !== 1 ? 's' : ''}
                                      {row.invoiceCount > 0 && ` · ${row.invoiceCount} invoice${row.invoiceCount !== 1 ? 's' : ''}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <p className="font-bold text-sm text-green-600 dark:text-green-400 tabular-nums">{formatSAR(row.totalAmount)}</p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {t && t.totalIncome > 0 ? ((row.totalAmount / t.totalIncome) * 100).toFixed(1) : 0}%
                                    </p>
                                  </div>
                                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                                </div>
                              </div>
                              <ProgressBar value={row.totalAmount} max={maxIncome} color="bg-green-400 dark:bg-green-500" />
                            </button>
                            {isOpen && (
                              <DrillDownPanel
                                loading={drillLoading}
                                invoices={drillData}
                                accentColor="green"
                                entityType="customer"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Income Total Footer */}
                  {data && data.income.length > 0 && (
                    <div className="px-5 py-3 border-t bg-green-50/70 dark:bg-green-950/20 flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">
                        Total — {data.income.length} client{data.income.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-base font-bold text-green-600 dark:text-green-400 tabular-nums">
                        {formatSAR(t?.totalIncome || 0)}
                      </span>
                    </div>
                  )}
                </CardContent>}
              </Card>

              {/* ── Expenses Column ──────────────────────────────────────── */}
              <div className="flex flex-col gap-4">

                {/* Supplier Payments */}
                <Card className="border-red-200 dark:border-red-900/50 flex flex-col">
                  <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 rounded-t-xl border-b border-red-100 dark:border-red-900/40">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <div className="p-1.5 bg-red-100 dark:bg-red-900/50 rounded-lg">
                          <Truck className="h-4 w-4" />
                        </div>
                        Supplier Payments
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-0">
                          {formatCompact(t?.totalSupplier || 0)}
                        </Badge>
                        <button onClick={() => setExpenseOpen(o => !o)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                          {expenseOpen ? <ChevronUp className="h-4 w-4 text-red-600 dark:text-red-400" /> : <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
                        </button>
                      </div>
                    </div>
                    {expenseOpen && (
                      <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search suppliers…"
                          value={expenseSearch}
                          onChange={e => setExpenseSearch(e.target.value)}
                          className="pl-8 h-8 text-sm bg-white/80 dark:bg-background/50 border-red-200 dark:border-red-900/50 focus-visible:ring-red-400"
                        />
                      </div>
                    )}
                  </CardHeader>

                  {expenseOpen && <CardContent className="flex-1 p-0">
                    {filteredExpenses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Truck className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm">No supplier payments for this period</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredExpenses.map((row, idx) => {
                          const isOpen = drillDown?.entityName === row.entityName && drillDown.type === 'supplier';
                          return (
                            <div key={idx}>
                              <button
                                onClick={() => openDrill(row.entityName, 'supplier')}
                                className="w-full px-5 py-3.5 hover:bg-red-50/50 dark:hover:bg-red-950/10 transition-colors text-left"
                              >
                                <div className="flex items-start justify-between gap-3 mb-1.5">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400 font-semibold text-xs">
                                      {row.entityName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm truncate" title={row.entityName}>{row.entityName}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {row.paymentCount} payment{row.paymentCount !== 1 ? 's' : ''}
                                        {row.invoiceCount > 0 && ` · ${row.invoiceCount} invoice${row.invoiceCount !== 1 ? 's' : ''}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="text-right">
                                      <p className="font-bold text-sm text-red-600 dark:text-red-400 tabular-nums">{formatSAR(row.totalAmount)}</p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {t && t.totalExpenses > 0 ? ((row.totalAmount / t.totalExpenses) * 100).toFixed(1) : 0}%
                                      </p>
                                    </div>
                                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                                  </div>
                                </div>
                                <ProgressBar value={row.totalAmount} max={maxExpense} color="bg-red-400 dark:bg-red-500" />
                              </button>
                              {isOpen && (
                                <DrillDownPanel
                                  loading={drillLoading}
                                  invoices={drillData}
                                  accentColor="red"
                                  entityType="supplier"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {data && data.expenses.length > 0 && (
                      <div className="px-5 py-3 border-t bg-red-50/70 dark:bg-red-950/20 flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted-foreground">
                          Total — {data.expenses.length} supplier{data.expenses.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-base font-bold text-red-600 dark:text-red-400 tabular-nums">
                          {formatSAR(t?.totalSupplier || 0)}
                        </span>
                      </div>
                    )}
                  </CardContent>}
                </Card>

                {/* Salaries */}
                <Card className="border-amber-200 dark:border-amber-900/50 flex flex-col">
                  <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 rounded-t-xl border-b border-amber-100 dark:border-amber-900/40">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                          <Users className="h-4 w-4" />
                        </div>
                        Salaries &amp; Wages
                      </CardTitle>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-0">
                        {formatCompact(t?.totalSalaries || 0)}
                      </Badge>
                    </div>
                    <div className="relative mt-2">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search salary records…"
                        value={salarySearch}
                        onChange={e => setSalarySearch(e.target.value)}
                        className="pl-8 h-8 text-sm bg-white/80 dark:bg-background/50 border-amber-200 dark:border-amber-900/50 focus-visible:ring-amber-400"
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 p-0">
                    {filteredSalaries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Users className="h-10 w-10 mb-3 opacity-20" />
                        <p className="text-sm">No salary records for this period</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {filteredSalaries.map((row, idx) => (
                          <div
                            key={idx}
                            className="px-5 py-3.5 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                                  {row.label.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate" title={row.label}>{row.label}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {row.ref && <span className="text-[11px] text-muted-foreground font-mono">{row.ref}</span>}
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] h-4 px-1.5 ${row.isPaid ? 'border-green-300 text-green-600 dark:text-green-400' : 'border-orange-300 text-orange-600 dark:text-orange-400'}`}
                                    >
                                      {row.isPaid ? 'Paid' : 'Pending'}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-sm text-amber-600 dark:text-amber-400 tabular-nums">{formatSAR(row.amount)}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {t && t.totalExpenses > 0 ? ((row.amount / t.totalExpenses) * 100).toFixed(1) : 0}%
                                </p>
                              </div>
                            </div>
                            <ProgressBar value={row.amount} max={maxSalary} color="bg-amber-400 dark:bg-amber-500" />
                          </div>
                        ))}
                      </div>
                    )}
                    {data && data.salaries.length > 0 && (
                      <div className="px-5 py-3 border-t bg-amber-50/70 dark:bg-amber-950/20 flex items-center justify-between">
                        <span className="text-sm font-semibold text-muted-foreground">
                          Total — {data.salaries.length} record{data.salaries.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatSAR(t?.totalSalaries || 0)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>{/* end Expenses column */}
            </div>{/* end side-by-side grid */}

            {/* ── Summary bar ─────────────────────────────────────────────── */}
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span className="font-medium">
                      {year === toYear && month === toMonth
                        ? `Period Summary — ${MONTH_NAMES[month - 1]} ${year}`
                        : `Period Summary — ${MONTH_NAMES[month - 1]} ${year} → ${MONTH_NAMES[toMonth - 1]} ${toYear}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                      <span className="text-sm text-muted-foreground">Income:</span>
                      <span className="text-sm font-bold text-green-600 tabular-nums">{formatSAR(t?.totalIncome || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                      <span className="text-sm text-muted-foreground">Expenses:</span>
                      <span className="text-sm font-bold text-red-600 tabular-nums">{formatSAR(t?.totalExpenses || 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${(t?.netProfit || 0) >= 0 ? 'bg-blue-500' : 'bg-red-500'}`} />
                      <span className="text-sm text-muted-foreground">Net:</span>
                      <span className={`text-sm font-bold tabular-nums ${(t?.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatSAR(t?.netProfit || 0)}
                      </span>
                    </div>
                    <Link href="/financial/reports/cash-flow">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                        View Cash Flow <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

          </>
        )}
      </div>
    </div>
  );
}
