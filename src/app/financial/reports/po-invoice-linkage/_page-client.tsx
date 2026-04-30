'use client';

import { Fragment, useState, useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, GitMerge, ChevronDown, ChevronUp, BarChart3,
  FileText, ShoppingCart, CheckCircle2, AlertCircle, AlertTriangle,
  ChevronRight, Package, XCircle, Search, List, Layers,
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

const INV_STATUS: Record<InvoicingStatus, { label: string; icon: ReactNode; badgeClass: string }> = {
  no_invoice: { label: 'No Invoice',      icon: <AlertCircle className="h-3.5 w-3.5" />,   badgeClass: 'bg-amber-100 text-amber-700' },
  partial:    { label: 'Partial',         icon: <AlertTriangle className="h-3.5 w-3.5" />, badgeClass: 'bg-sky-100 text-sky-700' },
  full:       { label: 'Fully Invoiced',  icon: <CheckCircle2 className="h-3.5 w-3.5" />,  badgeClass: 'bg-emerald-100 text-emerald-700' },
  over:       { label: 'Over-invoiced',   icon: <AlertTriangle className="h-3.5 w-3.5" />, badgeClass: 'bg-red-100 text-red-700' },
};

function poRowBg(po: PORecord) {
  if (po.status === '6' || po.status === '7') return 'opacity-50';
  if (po.invoicingStatus === 'no_invoice' && (po.status === '4' || po.status === '5'))
    return 'bg-red-50/60 border-l-2 border-l-red-400';
  if (po.invoicingStatus === 'no_invoice') return 'bg-amber-50/40';
  if (po.invoicingStatus === 'partial') return 'bg-sky-50/30';
  return '';
}

type ViewFilter = 'all' | 'no_invoice' | 'received_no_invoice';
type ViewMode  = 'supplier' | 'flat';

// ─── Shared PO table header ───────────────────────────────────────────────────

function PoTableHead({ showSupplier }: { showSupplier: boolean }) {
  return (
    <thead className="bg-slate-50 text-xs text-slate-500 border-b sticky top-0">
      <tr>
        <th className="px-2 py-2 w-4" />
        <th className="px-3 py-2 text-left">PO Ref</th>
        {showSupplier && <th className="px-3 py-2 text-left">Supplier</th>}
        <th className="px-3 py-2 text-left">Supplier Ref</th>
        <th className="px-3 py-2 text-left">Project</th>
        <th className="px-3 py-2 text-left">Date</th>
        <th className="px-3 py-2 text-left">PO Status</th>
        <th className="px-3 py-2 text-right">PO Amount</th>
        <th className="px-3 py-2 text-right">Invoiced</th>
        <th className="px-3 py-2 text-left">Invoice Status</th>
      </tr>
    </thead>
  );
}

// ─── Single PO row + its expanded invoice sub-rows ───────────────────────────

function PoRow({
  po,
  showSupplier,
  isExpanded,
  onToggle,
}: {
  po: PORecord;
  showSupplier: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const poSt = PO_STATUS[po.status] ?? { label: po.status, color: 'bg-slate-100 text-slate-600' };
  const invSt = INV_STATUS[po.invoicingStatus];
  const isReceivedNoInv = po.invoicingStatus === 'no_invoice' && (po.status === '4' || po.status === '5');
  const hasInvoices = po.invoices.length > 0;
  const expanded = Boolean(isExpanded);

  return (
    <Fragment>
      <tr
        className={`transition-colors ${poRowBg(po)} ${hasInvoices ? 'cursor-pointer hover:brightness-95' : ''}`}
        onClick={() => hasInvoices && onToggle()}
      >
        <td className="px-2 py-2 text-center text-slate-400 w-4">
          {hasInvoices && (expanded
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />)}
        </td>
        <td className="px-3 py-2 font-medium text-violet-700 whitespace-nowrap">{po.ref}</td>
        {showSupplier && (
          <td className="px-3 py-2 text-sm font-medium text-slate-700 whitespace-nowrap">{po.supplierName}</td>
        )}
        <td className="px-3 py-2 text-slate-500 text-xs">{po.refSupplier ?? '—'}</td>
        <td className="px-3 py-2 text-xs">
          {po.projectRef !== '—'
            ? <span className="font-medium text-slate-700">{po.projectRef}</span>
            : <span className="text-slate-400">—</span>}
        </td>
        <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">{fmtDate(po.dateOrder)}</td>
        <td className="px-3 py-2">
          <Badge className={`text-xs border-0 ${poSt.color}`}>{poSt.label}</Badge>
        </td>
        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmt(po.totalHT)}</td>
        <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-slate-600">
          {hasInvoices ? fmt(po.invoiceTotalHT) : '—'}
        </td>
        <td className="px-3 py-2">
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isReceivedNoInv ? 'bg-red-100 text-red-700' : invSt.badgeClass}`}>
            {isReceivedNoInv ? <AlertTriangle className="h-3.5 w-3.5" /> : invSt.icon}
            {isReceivedNoInv ? 'Received — No Invoice' : invSt.label}
          </div>
        </td>
      </tr>
      {expanded && po.invoices.map(inv => (
        <tr key={`inv-${inv.id}`} className="bg-indigo-50/50 border-l-2 border-l-indigo-300">
          <td className="px-2 py-1.5" />
          {showSupplier && <td className="px-3 py-1.5" />}
          <td className="px-3 py-1.5 pl-5" colSpan={1}>
            <div className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="font-medium text-indigo-700">{inv.ref}</span>
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
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PoInvoiceLinkagePage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('supplier');
  const [search, setSearch] = useState('');
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

  // ── Filtering (memoized) ──────────────────────────────────────────────────
  const q = search.trim().toLowerCase();

  const poMatchesSearch = (po: PORecord): boolean => {
    if (!q) return true;
    if (po.ref.toLowerCase().includes(q)) return true;
    if (po.refSupplier?.toLowerCase().includes(q)) return true;
    if (po.supplierName.toLowerCase().includes(q)) return true;
    if (po.projectRef.toLowerCase().includes(q)) return true;
    if (po.invoices.some(i => i.ref.toLowerCase().includes(q) || (i.refSupplier?.toLowerCase().includes(q) ?? false))) return true;
    return false;
  };

  const poMatchesStatusFilter = (po: PORecord): boolean => {
    if (viewFilter === 'no_invoice') return po.invoicingStatus === 'no_invoice' && po.status !== '6' && po.status !== '7';
    if (viewFilter === 'received_no_invoice') return po.invoicingStatus === 'no_invoice' && (po.status === '4' || po.status === '5');
    return true;
  };

  const filteredGroups: SupplierGroup[] = useMemo(() => allGroups
    .map(g => {
      if (supplierFilter && !g.supplierName.toLowerCase().includes(supplierFilter.toLowerCase())) return null;
      const pos = g.pos.filter(p => poMatchesStatusFilter(p) && poMatchesSearch(p));
      if (pos.length === 0) return null;
      return { ...g, pos };
    })
    .filter((g): g is SupplierGroup => g !== null),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [allGroups, supplierFilter, viewFilter, q]);

  const flatPOs: PORecord[] = useMemo(
    () => filteredGroups.flatMap(g => g.pos).sort((a, b) => (b.dateOrder ?? '').localeCompare(a.dateOrder ?? '')),
    [filteredGroups],
  );

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

        {/* ── Toolbar: search + view toggle ─────────────────────────────── */}
        {hasResults && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                className="pl-8 bg-white text-sm"
                placeholder="Search PO #, invoice #, supplier…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  onClick={() => setSearch('')}>
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* View toggle */}
            <div className="flex rounded-lg border bg-white overflow-hidden">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'supplier' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setViewMode('supplier')}
              >
                <Layers className="h-3.5 w-3.5" /> By Supplier
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l ${viewMode === 'flat' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setViewMode('flat')}
              >
                <List className="h-3.5 w-3.5" /> All POs
              </button>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded border-l-2 border-l-red-400 bg-red-50" /> Received, No Invoice</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-100" /> No Invoice</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-sky-100" /> Partial</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-white border" /> Fully Invoiced</span>
            </div>
          </div>
        )}

        {/* ── By Supplier view ──────────────────────────────────────────── */}
        {hasResults && viewMode === 'supplier' && filteredGroups.map(g => {
          const isOpen = expandedGroups.has(g.supplierId);
          return (
            <Card key={g.supplierId} className="overflow-hidden">
              <button className="w-full text-left" onClick={() => toggleGroup(g.supplierId)}>
                <CardHeader className="pb-3 pt-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{g.supplierName}</span>
                      <span className="text-xs text-slate-400">{g.poCount} PO{g.poCount !== 1 ? 's' : ''}</span>
                      {g.receivedNoInvoiceCount > 0 && (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs gap-1">
                          <AlertCircle className="h-3 w-3" /> {g.receivedNoInvoiceCount} received w/o invoice
                        </Badge>
                      )}
                      {g.noInvoiceCount > 0 && g.receivedNoInvoiceCount === 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs gap-1">
                          <AlertCircle className="h-3 w-3" /> {g.noInvoiceCount} no invoice
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">PO Total</p>
                        <p className="text-sm font-semibold text-blue-700">{fmt(g.poTotalHT)}</p>
                      </div>
                      <div className="text-right">
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
                      <PoTableHead showSupplier={false} />
                      <tbody className="divide-y">
                        {g.pos.map(po => (
                          <PoRow
                            key={po.id}
                            po={po}
                            showSupplier={false}
                            isExpanded={Boolean(expandedPOs.has(po.id)) as boolean}
                            onToggle={() => { togglePO(po.id); }}
                          />
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t text-xs font-semibold">
                        <tr>
                          <td colSpan={7} className="px-3 py-2" />
                          <td className="px-3 py-2 text-right text-blue-700">{fmt(g.poTotalHT)}</td>
                          <td className="px-3 py-2 text-right text-indigo-700">{fmt(g.invoiceTotalHT)}</td>
                          <td className="px-3 py-2 text-xs">
                            {g.noInvoiceCount > 0
                              ? <span className="text-amber-600">{g.noInvoiceCount} pending invoice</span>
                              : <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> All invoiced</span>}
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

        {/* ── All POs flat view ─────────────────────────────────────────── */}
        {hasResults && viewMode === 'flat' && (
          <Card>
            <CardContent className="pt-4 pb-3 px-0">
              <div className="px-4 pb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  {flatPOs.length} PO{flatPOs.length !== 1 ? 's' : ''}
                  {q && <span className="ml-1 text-slate-400 font-normal">matching &quot;{q}&quot;</span>}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <PoTableHead showSupplier={true} />
                  <tbody className="divide-y">
                    {flatPOs.map(po => (
                      <PoRow
                        key={po.id}
                        po={po}
                        showSupplier={true}
                        isExpanded={Boolean(expandedPOs.has(po.id)) as boolean}
                        onToggle={() => { togglePO(po.id); }}
                      />
                    ))}
                  </tbody>
                </table>
                {flatPOs.length === 0 && (
                  <div className="py-10 text-center text-slate-400 text-sm">No POs match the current filters.</div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Empty / no-match states ────────────────────────────────────── */}
        {hasResults && viewMode === 'supplier' && filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <XCircle className="h-12 w-12 mb-3 opacity-25" />
            <p className="font-medium text-slate-500">No POs match the current filter</p>
            <p className="text-sm mt-1">Try changing the Show dropdown or clearing the search.</p>
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
