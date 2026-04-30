'use client';

import { Fragment, useState, type ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, GitMerge, ChevronDown, ChevronUp, BarChart3,
  FileText, ShoppingCart, CheckCircle2, AlertCircle, AlertTriangle,
  ChevronRight, Package, XCircle,
} from 'lucide-react';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedInvoice {
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

type InvoicingStatus = 'no_invoice' | 'partial' | 'full' | 'over';

interface PORecord {
  id: number;
  ref: string;
  refSupplier: string | null;
  supplierId: number;
  supplierName: string;
  projectId: number | null;
  projectRef: string;
  projectTitle: string;
  status: string;
  totalHT: number;
  totalTTC: number;
  dateOrder: string | null;
  billed: boolean;
  note: string | null;
  invoices: LinkedInvoice[];
  invoiceTotalHT: number;
  invoiceTotalPaid: number;
  invoiceBalance: number;
  invoicingStatus: InvoicingStatus;
}

interface SupplierGroup {
  supplierId: number;
  supplierName: string;
  pos: PORecord[];
  poCount: number;
  noInvoiceCount: number;
  receivedNoInvoiceCount: number;
  poTotalHT: number;
  invoiceTotalHT: number;
}

interface Stats {
  totalPOs: number;
  posWithInvoice: number;
  posWithoutInvoice: number;
  receivedWithoutInvoice: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PO_STATUS: Record<string, { label: string; color: string }> = {
  '0': { label: 'Draft',           color: 'bg-slate-100 text-slate-600' },
  '1': { label: 'Validated',       color: 'bg-blue-100 text-blue-700' },
  '2': { label: 'Approved',        color: 'bg-indigo-100 text-indigo-700' },
  '3': { label: 'Ordered',         color: 'bg-violet-100 text-violet-700' },
  '4': { label: 'Part. Received',  color: 'bg-amber-100 text-amber-700' },
  '5': { label: 'Received',        color: 'bg-emerald-100 text-emerald-700' },
  '6': { label: 'Cancelled',       color: 'bg-red-100 text-red-600' },
  '7': { label: 'Refused',         color: 'bg-orange-100 text-orange-600' },
};

const INV_STATUS: Record<InvoicingStatus, { label: string; icon: ReactNode; rowClass: string; badgeClass: string }> = {
  no_invoice: {
    label: 'No Invoice',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    rowClass: 'bg-amber-50/40',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  partial: {
    label: 'Partial',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    rowClass: 'bg-sky-50/40',
    badgeClass: 'bg-sky-100 text-sky-700',
  },
  full: {
    label: 'Fully Invoiced',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    rowClass: '',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  over: {
    label: 'Over-invoiced',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    rowClass: 'bg-red-50/40',
    badgeClass: 'bg-red-100 text-red-700',
  },
};

// Received (4 or 5) with no invoice gets a stronger highlight
function poRowClass(po: PORecord) {
  if (po.invoicingStatus === 'no_invoice' && (po.status === '4' || po.status === '5')) {
    return 'bg-red-50/60 border-l-2 border-l-red-400';
  }
  if (po.status === '6' || po.status === '7') return 'opacity-50';
  return INV_STATUS[po.invoicingStatus].rowClass;
}

type ViewFilter = 'all' | 'no_invoice' | 'received_no_invoice';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PoInvoiceLinkagePage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [allGroups, setAllGroups] = useState<SupplierGroup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [expandedPOs, setExpandedPOs] = useState<Set<number>>(new Set());

  const toggleGroup = (id: number) => setExpandedGroups(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const togglePO = (id: number) => setExpandedPOs(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const generate = async () => {
    setLoading(true); setError('');
    try {
      const p = new URLSearchParams();
      if (fromDate) p.set('from', fromDate);
      if (toDate) p.set('to', toDate);
      const res = await fetch(`/api/financial/reports/po-invoice-linkage?${p}`);
      const data = await res.json() as { groups: SupplierGroup[]; stats: Stats; error?: string };
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      setAllGroups(data.groups);
      setStats(data.stats);
      // Auto-expand groups with urgent POs
      const urgentIds = new Set(data.groups.filter(g => g.receivedNoInvoiceCount > 0).map(g => g.supplierId));
      setExpandedGroups(urgentIds);
      setExpandedPOs(new Set());
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filteredGroups: SupplierGroup[] = allGroups
    .map(g => {
      let pos = g.pos;
      if (supplierFilter) {
        const q = supplierFilter.toLowerCase();
        if (!g.supplierName.toLowerCase().includes(q)) return null;
      }
      if (viewFilter === 'no_invoice') {
        pos = pos.filter(p => p.invoicingStatus === 'no_invoice' && p.status !== '6' && p.status !== '7');
      } else if (viewFilter === 'received_no_invoice') {
        pos = pos.filter(p => p.invoicingStatus === 'no_invoice' && (p.status === '4' || p.status === '5'));
      }
      if (pos.length === 0) return null;
      return { ...g, pos };
    })
    .filter((g): g is SupplierGroup => g !== null);

  const hasResults = allGroups.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="rounded-2xl border bg-gradient-to-br from-violet-700 via-indigo-700 to-purple-700 p-6 m-4 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-white/20 p-2.5"><GitMerge className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-bold">PO–Invoice Linkage</h1>
            <p className="text-violet-100 text-sm mt-0.5">Track which purchase orders have supplier invoices — and which don&apos;t</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-white/70 mb-1">Supplier (filter)</label>
            <Input placeholder="Type supplier name…" className="bg-white text-slate-800 w-52"
              value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">PO Date From</label>
            <Input type="date" className="bg-white text-slate-800 w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">PO Date To</label>
            <Input type="date" className="bg-white text-slate-800 w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-white/70 mb-1">Show</label>
            <select
              className="h-9 rounded-md bg-white text-slate-800 text-sm px-2 border-0 w-44"
              value={viewFilter}
              onChange={e => setViewFilter(e.target.value as ViewFilter)}
            >
              <option value="all">All POs</option>
              <option value="no_invoice">Missing Invoice</option>
              <option value="received_no_invoice">Received — No Invoice</option>
            </select>
          </div>
          <Button className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shrink-0" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <BarChart3 className="h-4 w-4 mr-1.5" />}
            Generate Report
          </Button>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* ── KPI strip ─────────────────────────────────────────────────── */}
        {hasResults && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-l-4 border-l-violet-500 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total POs</p>
              <p className="text-2xl font-bold">{stats.totalPOs}</p>
              <p className="text-xs text-slate-400">purchase orders</p>
            </div>
            <div className="rounded-xl border border-l-4 border-l-emerald-500 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Invoiced</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.posWithInvoice}</p>
              <p className="text-xs text-slate-400">have invoices</p>
            </div>
            <div className="rounded-xl border border-l-4 border-l-amber-400 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">No Invoice</p>
              <p className="text-2xl font-bold text-amber-600">{stats.posWithoutInvoice}</p>
              <p className="text-xs text-slate-400">missing invoice</p>
            </div>
            <div className="rounded-xl border border-l-4 border-l-red-500 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Received — No Invoice</p>
              <p className="text-2xl font-bold text-red-600">{stats.receivedWithoutInvoice}</p>
              <p className="text-xs text-slate-400">delivered, awaiting invoice</p>
            </div>
          </div>
        )}

        {/* ── Legend ────────────────────────────────────────────────────── */}
        {hasResults && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-200 border-l-2 border-l-red-400" /> Received — No Invoice</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-100" /> No Invoice (not yet received)</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-sky-100" /> Partially Invoiced</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-white border" /> Fully Invoiced</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-slate-100 opacity-50" /> Cancelled / Refused</span>
          </div>
        )}

        {/* ── Supplier groups ────────────────────────────────────────────── */}
        {filteredGroups.map(g => {
          const isOpen = expandedGroups.has(g.supplierId);
          return (
            <Card key={g.supplierId} className="overflow-hidden">
              <button className="w-full text-left" onClick={() => toggleGroup(g.supplierId)}>
                <CardHeader className="pb-3 pt-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-base">{g.supplierName}</span>
                      <span className="text-xs text-slate-400">{g.poCount} PO{g.poCount !== 1 ? 's' : ''}</span>
                      {g.receivedNoInvoiceCount > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {g.receivedNoInvoiceCount} received w/o invoice
                        </Badge>
                      )}
                      {g.noInvoiceCount > 0 && g.receivedNoInvoiceCount === 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {g.noInvoiceCount} no invoice
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-5 text-right">
                      <div>
                        <p className="text-xs text-slate-400">PO Total</p>
                        <p className="text-sm font-semibold text-blue-700">{fmt(g.poTotalHT)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Invoiced</p>
                        <p className="text-sm font-semibold text-slate-700">{fmt(g.invoiceTotalHT)}</p>
                      </div>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {isOpen && (
                <CardContent className="pt-0 pb-3">
                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b">
                        <tr>
                          <th className="px-3 py-2 w-4" />
                          <th className="px-3 py-2 text-left">PO Ref</th>
                          <th className="px-3 py-2 text-left">Supplier Ref</th>
                          <th className="px-3 py-2 text-left">Project</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">PO Status</th>
                          <th className="px-3 py-2 text-right">PO Amount</th>
                          <th className="px-3 py-2 text-right">Invoiced</th>
                          <th className="px-3 py-2 text-left">Invoice Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {g.pos.map(po => {
                          const poSt = PO_STATUS[po.status] ?? { label: po.status, color: 'bg-slate-100 text-slate-600' };
                          const invSt = INV_STATUS[po.invoicingStatus];
                          const isReceivedNoInv = po.invoicingStatus === 'no_invoice' && (po.status === '4' || po.status === '5');
                          const isPoExpanded = expandedPOs.has(po.id);
                          return (
                            <Fragment key={po.id}>
                              <tr
                                className={`transition-colors ${poRowClass(po)} ${po.invoices.length > 0 ? 'cursor-pointer hover:brightness-95' : ''}`}
                                onClick={() => po.invoices.length > 0 && togglePO(po.id)}
                              >
                                <td className="px-2 py-2 text-center text-slate-400">
                                  {po.invoices.length > 0 ? (
                                    isPoExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 font-medium text-violet-700 whitespace-nowrap">{po.ref}</td>
                                <td className="px-3 py-2 text-slate-500 text-xs">{po.refSupplier ?? '—'}</td>
                                <td className="px-3 py-2 text-xs">
                                  {po.projectRef !== '—' ? (
                                    <span className="font-medium text-slate-700">{po.projectRef}</span>
                                  ) : <span className="text-slate-400">—</span>}
                                </td>
                                <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">{fmtDate(po.dateOrder)}</td>
                                <td className="px-3 py-2">
                                  <Badge className={`text-xs border-0 ${poSt.color}`}>{poSt.label}</Badge>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmt(po.totalHT)}</td>
                                <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-slate-600">
                                  {po.invoices.length > 0 ? fmt(po.invoiceTotalHT) : '—'}
                                </td>
                                <td className="px-3 py-2">
                                  <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${invSt.badgeClass} ${isReceivedNoInv ? '!bg-red-100 !text-red-700' : ''}`}>
                                    {isReceivedNoInv ? <AlertTriangle className="h-3.5 w-3.5" /> : invSt.icon}
                                    {isReceivedNoInv ? 'Received — No Invoice' : invSt.label}
                                  </div>
                                </td>
                              </tr>

                              {/* Linked invoices sub-rows */}
                              {isPoExpanded && po.invoices.map(inv => (
                                <tr key={`inv-${inv.id}`} className="bg-indigo-50/50 border-l-2 border-l-indigo-300">
                                  <td className="px-2 py-1.5" />
                                  <td className="px-3 py-1.5 pl-6" colSpan={1}>
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <FileText className="h-3 w-3 text-indigo-500 shrink-0" />
                                      <span className="font-medium text-indigo-700">{inv.ref}</span>
                                      {inv.refSupplier && <span className="text-slate-400">({inv.refSupplier})</span>}
                                    </div>
                                  </td>
                                  <td className="px-3 py-1.5 text-xs text-slate-500">{inv.refSupplier ?? '—'}</td>
                                  <td className="px-3 py-1.5" />
                                  <td className="px-3 py-1.5 text-xs text-slate-500 whitespace-nowrap">{fmtDate(inv.dateInvoice)}</td>
                                  <td className="px-3 py-1.5 text-xs text-slate-400 whitespace-nowrap">Due: {fmtDate(inv.dateDue)}</td>
                                  <td className="px-3 py-1.5 text-right text-xs font-semibold text-indigo-700">{fmt(inv.totalHT)}</td>
                                  <td className="px-3 py-1.5 text-right text-xs text-emerald-600">{fmt(inv.totalPaid)}</td>
                                  <td className="px-3 py-1.5">
                                    <Badge className={`text-xs border-0 ${inv.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      {inv.isPaid ? 'Paid' : `Open — ${fmt(inv.balance)}`}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t text-xs font-semibold">
                        <tr>
                          <td className="px-3 py-2" colSpan={6} />
                          <td className="px-3 py-2 text-right text-blue-700">{fmt(g.poTotalHT)}</td>
                          <td className="px-3 py-2 text-right text-indigo-700">{fmt(g.invoiceTotalHT)}</td>
                          <td className="px-3 py-2 text-xs text-slate-400">
                            {g.noInvoiceCount > 0
                              ? <span className="text-amber-600">{g.noInvoiceCount} PO{g.noInvoiceCount !== 1 ? 's' : ''} pending invoice</span>
                              : <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> All invoiced</span>
                            }
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* ── Empty / no-match states ────────────────────────────────────── */}
        {hasResults && filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <XCircle className="h-12 w-12 mb-3 opacity-25" />
            <p className="font-medium text-slate-500">No POs match the current filter</p>
            <p className="text-sm mt-1">Try changing the &quot;Show&quot; dropdown or clearing the supplier filter.</p>
          </div>
        )}

        {!loading && !hasResults && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="flex gap-3 mb-5 opacity-25">
              <ShoppingCart className="h-12 w-12" />
              <Package className="h-12 w-12" />
              <FileText className="h-12 w-12" />
            </div>
            <p className="font-medium text-slate-500">Set filters and click Generate Report</p>
            <p className="text-sm mt-1">Shows all purchase orders with their invoice status, grouped by supplier</p>
          </div>
        )}
      </div>
    </div>
  );
}
