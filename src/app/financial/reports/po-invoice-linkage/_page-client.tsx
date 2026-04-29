'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Loader2, GitMerge, ChevronDown, ChevronUp, BarChart3,
  FileText, ShoppingCart, CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  CalendarClock, ArrowUpDown, Truck, Receipt, Clock, FileSpreadsheet,
  BookOpen, List, Layers, Settings, Banknote, Wallet, FolderOpen, Package, Users,
  Building2,
} from 'lucide-react';
import Link from 'next/link';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
}

const PO_STATUS: Record<string, { label: string; color: string }> = {
  '0': { label: 'Draft', color: 'bg-slate-100 text-slate-600' },
  '1': { label: 'Validated', color: 'bg-blue-100 text-blue-700' },
  '2': { label: 'Approved', color: 'bg-indigo-100 text-indigo-700' },
  '3': { label: 'Ordered', color: 'bg-violet-100 text-violet-700' },
  '4': { label: 'Part. Received', color: 'bg-amber-100 text-amber-700' },
  '5': { label: 'Received', color: 'bg-emerald-100 text-emerald-700' },
  '6': { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  '7': { label: 'Refused', color: 'bg-orange-100 text-orange-700' },
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
  { href: '/financial/reports/po-invoice-linkage',             icon: GitMerge,        label: 'PO–Invoice Linkage', active: true },
  { href: '/financial/reports/coa-credit-balance',             icon: BarChart3,       label: 'COA Credit Balance' },
  { href: '/financial/reports/cogs-supplier-map',              icon: Layers,          label: 'COGS Supplier Map' },
  { href: '/financial/reports/ots-journal-entries',            icon: BookOpen,        label: 'OTS Journal Entries' },
  { href: '/financial/journal-entries',                        icon: List,            label: 'Journal Entries' },
  { href: '/financial/chart-of-accounts',                      icon: FileText,        label: 'Chart of Accounts' },
  { href: '/financial/product-coa-mapping',                    icon: Layers,          label: 'Cost Classification' },
  { href: '/financial/settings',                               icon: Settings,        label: 'Settings' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PO {
  id: number;
  ref: string;
  refSupplier: string | null;
  status: string;
  totalHT: number;
  totalTTC: number;
  dateOrder: string | null;
  dateCreation: string | null;
  billed: boolean;
  note: string | null;
}

interface Invoice {
  id: number;
  ref: string;
  refSupplier: string | null;
  dateInvoice: string | null;
  dateDue: string | null;
  totalHT: number;
  totalTTC: number;
  isPaid: boolean;
  totalPaid: number;
  balance: number;
}

interface Group {
  supplierName: string;
  supplierId: number;
  projectRef: string;
  projectTitle: string;
  projectId: number | null;
  purchaseOrders: PO[];
  invoices: Invoice[];
  poTotalHT: number;
  invTotalHT: number;
  totalPaid: number;
  variance: number;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PoInvoiceLinkagePage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [poCount, setPoCount] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams();
      if (fromDate) p.set('from', fromDate);
      if (toDate) p.set('to', toDate);
      const res = await fetch(`/api/financial/reports/po-invoice-linkage?${p}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      // Filter client-side by supplier name if entered
      const filtered = supplierFilter
        ? (data.groups as Group[]).filter(g => g.supplierName.toLowerCase().includes(supplierFilter.toLowerCase()))
        : data.groups;
      setGroups(filtered);
      setInvoiceCount(data.invoiceCount);
      setPoCount(data.poCount);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const totalInv = groups.reduce((s, g) => s + g.invTotalHT, 0);
  const totalPO = groups.reduce((s, g) => s + g.poTotalHT, 0);
  const totalPaid = groups.reduce((s, g) => s + g.totalPaid, 0);

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
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${l.active ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{l.label}</span>
            </Link>
          );
        })}
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-700 via-indigo-700 to-purple-700 p-6 m-4 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-xl bg-white/20 p-2.5"><GitMerge className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold">PO–Invoice Linkage</h1>
              <p className="text-violet-100 text-sm mt-0.5">Match purchase orders to their supplier invoices by project &amp; supplier</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-white/70 mb-1">Supplier (filter)</label>
              <Input placeholder="Type supplier name…" className="bg-white text-slate-800 w-52"
                value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">Invoice From</label>
              <Input type="date" className="bg-white text-slate-800 w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">Invoice To</label>
              <Input type="date" className="bg-white text-slate-800 w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <Button className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shrink-0" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <BarChart3 className="h-4 w-4 mr-1.5" />}
              Generate Report
            </Button>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-5">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {groups.length > 0 && (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-l-4 border-l-violet-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Groups</p>
                  <p className="text-xl font-bold">{groups.length}</p>
                  <p className="text-xs text-slate-400">supplier×project</p>
                </div>
                <div className="rounded-xl border border-l-4 border-l-blue-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">PO Total</p>
                  <p className="text-xl font-bold">{fmt(totalPO)}</p>
                  <p className="text-xs text-slate-400">{poCount} POs</p>
                </div>
                <div className="rounded-xl border border-l-4 border-l-indigo-500 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Invoice Total</p>
                  <p className="text-xl font-bold">{fmt(totalInv)}</p>
                  <p className="text-xs text-slate-400">{invoiceCount} invoices</p>
                </div>
                <div className={`rounded-xl border border-l-4 ${totalInv - totalPO > 0 ? 'border-l-red-500' : 'border-l-emerald-500'} bg-white px-5 py-4 shadow-sm`}>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Variance</p>
                  <p className={`text-xl font-bold ${totalInv - totalPO > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(totalInv - totalPO)}</p>
                  <p className="text-xs text-slate-400">inv − PO</p>
                </div>
              </div>

              {/* Groups */}
              {groups.map((g, gi) => {
                const isOpen = expanded.has(gi);
                return (
                  <Card key={gi}>
                    <button className="w-full text-left" onClick={() => toggle(gi)}>
                      <CardHeader className="pb-3 pt-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800">{g.supplierName}</span>
                              {g.projectRef !== '—' && (
                                <Badge variant="outline" className="text-xs">{g.projectRef}</Badge>
                              )}
                              {g.projectTitle && g.projectTitle !== g.projectRef && (
                                <span className="text-xs text-slate-400 truncate max-w-[200px]">{g.projectTitle}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {g.purchaseOrders.length} PO{g.purchaseOrders.length !== 1 ? 's' : ''} · {g.invoices.length} invoice{g.invoices.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-xs text-slate-400">PO Total</p>
                              <p className="text-sm font-semibold text-blue-700">{fmt(g.poTotalHT)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Invoiced</p>
                              <p className="text-sm font-semibold text-slate-800">{fmt(g.invTotalHT)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Variance</p>
                              <p className={`text-sm font-bold ${g.variance > 0.01 ? 'text-red-600' : g.variance < -0.01 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {fmt(g.variance)}
                              </p>
                            </div>
                            {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                          </div>
                        </div>
                      </CardHeader>
                    </button>

                    {isOpen && (
                      <CardContent className="pt-0 pb-4 space-y-4">
                        {/* Purchase Orders */}
                        {g.purchaseOrders.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <ShoppingCart className="h-3.5 w-3.5" /> Purchase Orders
                            </p>
                            <div className="rounded-lg border overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 border-b">
                                  <tr>
                                    <th className="px-3 py-2 text-left">PO Ref</th>
                                    <th className="px-3 py-2 text-left">Supplier Ref</th>
                                    <th className="px-3 py-2 text-left">Date</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                    <th className="px-3 py-2 text-right">Amount (excl.)</th>
                                    <th className="px-3 py-2 text-left">Billed</th>
                                    <th className="px-3 py-2 text-left">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {g.purchaseOrders.map(po => {
                                    const st = PO_STATUS[po.status] ?? { label: po.status, color: 'bg-slate-100 text-slate-600' };
                                    return (
                                      <tr key={po.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 font-medium text-violet-700">{po.ref}</td>
                                        <td className="px-3 py-2 text-slate-500">{po.refSupplier ?? '—'}</td>
                                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(po.dateOrder ?? po.dateCreation)}</td>
                                        <td className="px-3 py-2"><Badge className={`text-xs border-0 ${st.color}`}>{st.label}</Badge></td>
                                        <td className="px-3 py-2 text-right font-semibold">{fmt(po.totalHT)}</td>
                                        <td className="px-3 py-2">
                                          {po.billed
                                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            : <AlertCircle className="h-4 w-4 text-amber-400" />}
                                        </td>
                                        <td className="px-3 py-2 text-xs text-slate-400 max-w-[160px] truncate">{po.note ?? '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-blue-50 border-t">
                                  <tr>
                                    <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-slate-600">PO Subtotal</td>
                                    <td className="px-3 py-2 text-right font-bold text-blue-700">{fmt(g.poTotalHT)}</td>
                                    <td colSpan={2} />
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                        {g.purchaseOrders.length === 0 && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            No purchase orders found for this supplier / project combination.
                          </div>
                        )}

                        {/* Invoices */}
                        {g.invoices.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" /> Supplier Invoices
                            </p>
                            <div className="rounded-lg border overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 border-b">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Invoice Ref</th>
                                    <th className="px-3 py-2 text-left">Supplier Ref</th>
                                    <th className="px-3 py-2 text-left">Date</th>
                                    <th className="px-3 py-2 text-left">Due</th>
                                    <th className="px-3 py-2 text-right">Amount (excl.)</th>
                                    <th className="px-3 py-2 text-right">Paid</th>
                                    <th className="px-3 py-2 text-right">Balance</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {g.invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50">
                                      <td className="px-3 py-2 font-medium text-indigo-700">{inv.ref}</td>
                                      <td className="px-3 py-2 text-slate-500">{inv.refSupplier ?? '—'}</td>
                                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(inv.dateInvoice)}</td>
                                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtDate(inv.dateDue)}</td>
                                      <td className="px-3 py-2 text-right font-semibold">{fmt(inv.totalHT)}</td>
                                      <td className="px-3 py-2 text-right text-emerald-600">{fmt(inv.totalPaid)}</td>
                                      <td className={`px-3 py-2 text-right font-semibold ${inv.balance > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(inv.balance)}</td>
                                      <td className="px-3 py-2">
                                        <Badge className={`text-xs border-0 ${inv.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                          {inv.isPaid ? 'Paid' : 'Open'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot className="bg-indigo-50 border-t">
                                  <tr>
                                    <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-slate-600">Invoice Subtotal</td>
                                    <td className="px-3 py-2 text-right font-bold text-indigo-700">{fmt(g.invTotalHT)}</td>
                                    <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmt(g.totalPaid)}</td>
                                    <td className="px-3 py-2 text-right font-bold text-red-600">{fmt(g.invTotalHT - g.totalPaid)}</td>
                                    <td />
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Variance summary */}
                        <div className={`rounded-lg px-4 py-2.5 flex items-center gap-3 text-sm ${
                          Math.abs(g.variance) < 0.01 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          : g.variance > 0 ? 'bg-red-50 border border-red-200 text-red-700'
                          : 'bg-amber-50 border border-amber-200 text-amber-700'
                        }`}>
                          {Math.abs(g.variance) < 0.01
                            ? <><CheckCircle2 className="h-4 w-4" /> PO and Invoice totals match exactly.</>
                            : g.variance > 0
                              ? <><AlertCircle className="h-4 w-4" /> Invoiced <strong>{fmt(g.variance)}</strong> more than PO total — over-invoiced or missing PO.</>
                              : <><AlertCircle className="h-4 w-4" /> PO total exceeds invoices by <strong>{fmt(Math.abs(g.variance))}</strong> — pending invoices expected.</>
                          }
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </>
          )}

          {!loading && groups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <GitMerge className="h-14 w-14 mb-4 opacity-25" />
              <p className="font-medium text-slate-500">Set filters and click Generate Report</p>
              <p className="text-sm mt-1">Groups supplier invoices with their purchase orders by project</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
