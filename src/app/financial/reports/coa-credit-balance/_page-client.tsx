'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Loader2, BarChart3, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, ArrowUpDown, Truck, Receipt, Clock,
  FileSpreadsheet, BookOpen, List, Layers, Settings, Banknote,
  Wallet, FolderOpen, Package, Users, Building2, FileText,
  CalendarClock, GitMerge, Search,
} from 'lucide-react';
import Link from 'next/link';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n === 0) return '—';
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(n);
}
function fmtAbs(n: number) {
  if (n === 0) return '—';
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(Math.abs(n));
}

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  asset:     { label: 'Assets',       color: 'bg-blue-100 text-blue-700' },
  liability: { label: 'Liabilities',  color: 'bg-red-100 text-red-700' },
  equity:    { label: 'Equity',       color: 'bg-violet-100 text-violet-700' },
  revenue:   { label: 'Revenue',      color: 'bg-emerald-100 text-emerald-700' },
  expense:   { label: 'Expenses',     color: 'bg-amber-100 text-amber-700' },
  cogs:      { label: 'COGS',         color: 'bg-orange-100 text-orange-700' },
};

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
  { href: '/financial/reports/payment-schedule',               icon: CalendarClock,   label: 'Payment Schedule' },
  { href: '/financial/reports/project-analysis',               icon: FolderOpen,      label: 'Project Analysis' },
  { href: '/financial/reports/wip',                            icon: Wallet,          label: 'WIP Report' },
  { href: '/financial/reports/projects-dashboard',             icon: Banknote,        label: 'Projects Financial' },
  { href: '/financial/reports/project-cost-structure',         icon: Package,         label: 'Cost Structure' },
  { href: '/financial/reports/supplier-invoice-report',        icon: Truck,           label: 'Supplier Invoice Report' },
  { href: '/financial/reports/po-invoice-linkage',             icon: GitMerge,        label: 'PO–Invoice Linkage' },
  { href: '/financial/reports/coa-credit-balance',             icon: BarChart3,       label: 'COA Credit Balance', active: true },
  { href: '/financial/reports/cogs-supplier-map',              icon: Layers,          label: 'COGS Supplier Map' },
  { href: '/financial/reports/ots-journal-entries',            icon: BookOpen,        label: 'OTS Journal Entries' },
  { href: '/financial/journal-entries',                        icon: List,            label: 'Journal Entries' },
  { href: '/financial/chart-of-accounts',                      icon: FileText,        label: 'Chart of Accounts' },
  { href: '/financial/product-coa-mapping',                    icon: Layers,          label: 'Cost Classification' },
  { href: '/financial/settings',                               icon: Settings,        label: 'Settings' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Account {
  accountCode: string;
  accountName: string;
  accountNameAr: string | null;
  accountType: string;
  accountCategory: string | null;
  openingDebit: number;
  openingCredit: number;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  closingBalance: number;
  netDebit: number;
  netCredit: number;
}

interface Group {
  accountType: string;
  accounts: Account[];
  totalOpeningDebit: number;
  totalOpeningCredit: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalClosingDebit: number;
  totalClosingCredit: number;
}

interface ReportData {
  period: { from: string; to: string };
  groups: Group[];
  totals: {
    openingDebit: number; openingCredit: number;
    periodDebit: number; periodCredit: number;
    closingDebit: number; closingCredit: number;
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoaCreditBalancePage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const toggle = (t: string) => setExpandedTypes(prev => {
    const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n;
  });
  const expandAll = () => report && setExpandedTypes(new Set(report.groups.map(g => g.accountType)));
  const collapseAll = () => setExpandedTypes(new Set());

  const generate = async () => {
    if (!fromDate || !toDate) { setError('Please select both dates.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/financial/reports/coa-credit-balance?from=${fromDate}&to=${toDate}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      setReport(data);
      setExpandedTypes(new Set(data.groups.map((g: Group) => g.accountType)));
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const filterAccounts = (accs: Account[]) => {
    if (!search.trim()) return accs;
    const q = search.toLowerCase();
    return accs.filter(a =>
      a.accountCode.toLowerCase().includes(q) ||
      a.accountName.toLowerCase().includes(q) ||
      (a.accountNameAr ?? '').includes(q)
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r bg-white p-3 gap-0.5 overflow-y-auto">
        <div className="mb-3 px-2">
          <Link href="/financial" className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Financial
          </Link>
        </div>
        {REPORT_LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${l.active ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-rose-700 via-pink-700 to-fuchsia-700 p-6 m-4 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-white/20 p-2.5"><BarChart3 className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold">COA Credit Balance</h1>
              <p className="text-rose-100 text-sm mt-0.5">Chart of accounts — opening, period movements, and closing credit balance</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-white/70 mb-1">From</label>
              <Input type="date" className="bg-white text-slate-800 w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">To</label>
              <Input type="date" className="bg-white text-slate-800 w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <Button className="bg-white text-rose-700 hover:bg-rose-50 font-semibold shrink-0" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <BarChart3 className="h-4 w-4 mr-1.5" />}
              Generate
            </Button>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {report && !loading && (
            <>
              {/* Summary totals */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-l-4 border-l-blue-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase">Opening Debit</p>
                  <p className="text-lg font-bold">{fmt(report.totals.openingDebit)}</p>
                </div>
                <div className="rounded-xl border border-l-4 border-l-rose-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase">Opening Credit</p>
                  <p className="text-lg font-bold text-rose-600">{fmt(report.totals.openingCredit)}</p>
                </div>
                <div className="rounded-xl border border-l-4 border-l-violet-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase">Period Debit</p>
                  <p className="text-lg font-bold">{fmt(report.totals.periodDebit)}</p>
                </div>
                <div className="rounded-xl border border-l-4 border-l-pink-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase">Period Credit</p>
                  <p className="text-lg font-bold text-pink-600">{fmt(report.totals.periodCredit)}</p>
                </div>
                <div className="rounded-xl border border-l-4 border-l-emerald-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase">Closing Debit</p>
                  <p className="text-lg font-bold text-emerald-700">{fmt(report.totals.closingDebit)}</p>
                </div>
                <div className="rounded-xl border border-l-4 border-l-fuchsia-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase">Closing Credit</p>
                  <p className="text-lg font-bold text-fuchsia-700">{fmt(report.totals.closingCredit)}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search account code or name…" className="pl-9"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
              </div>

              {/* Account type groups */}
              {report.groups.map(group => {
                const filtered = filterAccounts(group.accounts);
                if (filtered.length === 0) return null;
                const isOpen = expandedTypes.has(group.accountType);
                const tl = TYPE_LABEL[group.accountType] ?? { label: group.accountType, color: 'bg-slate-100 text-slate-600' };
                return (
                  <Card key={group.accountType}>
                    <button className="w-full text-left" onClick={() => toggle(group.accountType)}>
                      <CardHeader className="pb-2 pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Badge className={`${tl.color} border-0 text-xs`}>{tl.label}</Badge>
                            <span className="text-xs text-slate-400">{filtered.length} accounts</span>
                          </div>
                          <div className="flex items-center gap-6 text-right text-sm">
                            <div>
                              <p className="text-xs text-slate-400">Closing Cr</p>
                              <p className="font-bold text-fuchsia-700">{fmt(group.totalClosingCredit)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Closing Dr</p>
                              <p className="font-bold text-emerald-700">{fmt(group.totalClosingDebit)}</p>
                            </div>
                            {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </div>
                      </CardHeader>
                    </button>

                    {isOpen && (
                      <CardContent className="pt-0 pb-3">
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-xs text-slate-500 border-b">
                              <tr>
                                <th className="px-3 py-2 text-left w-28">Code</th>
                                <th className="px-3 py-2 text-left">Account Name</th>
                                <th className="px-3 py-2 text-right">Opening Dr</th>
                                <th className="px-3 py-2 text-right bg-rose-50">Opening Cr</th>
                                <th className="px-3 py-2 text-right">Period Dr</th>
                                <th className="px-3 py-2 text-right bg-pink-50">Period Cr</th>
                                <th className="px-3 py-2 text-right">Closing Dr</th>
                                <th className="px-3 py-2 text-right bg-fuchsia-50">Closing Cr</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {filtered.map(acc => (
                                <tr key={acc.accountCode} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{acc.accountCode}</td>
                                  <td className="px-3 py-2">
                                    <p className="font-medium text-slate-800">{acc.accountName}</p>
                                    {acc.accountNameAr && <p className="text-xs text-slate-400 font-arabic">{acc.accountNameAr}</p>}
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600">{fmtAbs(acc.openingDebit)}</td>
                                  <td className="px-3 py-2 text-right text-rose-600 bg-rose-50/40 font-semibold">{fmtAbs(acc.openingCredit)}</td>
                                  <td className="px-3 py-2 text-right text-slate-600">{fmtAbs(acc.periodDebit)}</td>
                                  <td className="px-3 py-2 text-right text-pink-600 bg-pink-50/40 font-semibold">{fmtAbs(acc.periodCredit)}</td>
                                  <td className="px-3 py-2 text-right font-bold text-emerald-700">{fmtAbs(acc.closingDebit)}</td>
                                  <td className="px-3 py-2 text-right font-bold text-fuchsia-700 bg-fuchsia-50/40">{fmtAbs(acc.closingCredit)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="border-t bg-slate-100">
                              <tr>
                                <td colSpan={2} className="px-3 py-2 text-xs font-bold text-slate-700">Subtotal — {tl.label}</td>
                                <td className="px-3 py-2 text-right font-bold">{fmt(group.totalOpeningDebit)}</td>
                                <td className="px-3 py-2 text-right font-bold text-rose-700 bg-rose-50">{fmt(group.totalOpeningCredit)}</td>
                                <td className="px-3 py-2 text-right font-bold">{fmt(group.totalPeriodDebit)}</td>
                                <td className="px-3 py-2 text-right font-bold text-pink-700 bg-pink-50">{fmt(group.totalPeriodCredit)}</td>
                                <td className="px-3 py-2 text-right font-bold text-emerald-700">{fmt(group.totalClosingDebit)}</td>
                                <td className="px-3 py-2 text-right font-bold text-fuchsia-700 bg-fuchsia-50">{fmt(group.totalClosingCredit)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              {/* Grand totals footer */}
              <div className="rounded-xl border bg-gradient-to-r from-slate-800 to-slate-700 text-white p-4 flex flex-wrap gap-6 shadow">
                <div><p className="text-xs text-slate-300">Total Opening Dr</p><p className="text-lg font-bold">{fmt(report.totals.openingDebit)}</p></div>
                <div><p className="text-xs text-slate-300">Total Opening Cr</p><p className="text-lg font-bold text-rose-300">{fmt(report.totals.openingCredit)}</p></div>
                <div><p className="text-xs text-slate-300">Period Dr</p><p className="text-lg font-bold">{fmt(report.totals.periodDebit)}</p></div>
                <div><p className="text-xs text-slate-300">Period Cr</p><p className="text-lg font-bold text-pink-300">{fmt(report.totals.periodCredit)}</p></div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-300">Closing Credit Balance</p>
                  <p className="text-2xl font-black text-fuchsia-300">{fmt(report.totals.closingCredit)}</p>
                </div>
              </div>
            </>
          )}

          {!report && !loading && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <BarChart3 className="h-14 w-14 mb-4 opacity-25" />
              <p className="font-medium text-slate-500">Select a date range and click Generate</p>
              <p className="text-sm mt-1">Shows all COA accounts with opening, period, and closing credit balances</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
