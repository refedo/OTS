'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ShoppingCart, ChevronLeft, ChevronRight, ExternalLink, FileText, X, Search } from 'lucide-react';

interface LinkedInvoice {
  dolibarr_id: number;
  ref: string;
  ref_supplier: string | null;
  total_ttc: number;
  is_paid: number;
}

interface PurchaseOrder {
  id: number | string;
  ref: string;
  ref_supplier?: string | null;
  socid: number | string;
  supplier_name?: string | null;
  statut: string;
  status: string;
  billed: string;
  total_ht: string | number;
  total_tva: string | number;
  total_ttc: string | number;
  date_commande?: number | string | null;
  date_livraison?: number | string | null;
  project_ref?: string | null;
  note_public?: string | null;
  linked_invoices?: LinkedInvoice[];
  [key: string]: unknown;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  '0': 'Draft',
  '1': 'Validated',
  '2': 'Approved',
  '3': 'Ordered',
  '4': 'Partially Received',
  '5': 'Received',
  '6': 'Canceled',
  '7': 'Refused',
};

const STATUS_COLORS: Record<string, string> = {
  '0': 'bg-gray-100 text-gray-700',
  '1': 'bg-blue-100 text-blue-700',
  '2': 'bg-indigo-100 text-indigo-700',
  '3': 'bg-yellow-100 text-yellow-700',
  '4': 'bg-orange-100 text-orange-700',
  '5': 'bg-green-100 text-green-700',
  '6': 'bg-red-100 text-red-700',
  '7': 'bg-red-100 text-red-700',
};

function formatDate(ts: number | string | null | undefined): string {
  if (!ts) return '—';
  const ms = typeof ts === 'string' ? parseInt(ts, 10) * 1000 : ts * 1000;
  if (isNaN(ms)) return '—';
  return new Date(ms).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(val: string | number | null | undefined): string {
  if (val == null || val === '') return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-SA-u-ca-gregory', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const fmtSAR = (v: number) =>
  new Intl.NumberFormat('en-SA-u-ca-gregory', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(v);

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function PoDetailSheet({ order, open, onClose }: { order: PurchaseOrder | null; open: boolean; onClose: () => void }) {
  if (!order) return null;
  const invoices = order.linked_invoices ?? [];

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-mono text-lg">{order.ref}</SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
          {order.ref_supplier && (
            <p className="text-sm text-muted-foreground">Supplier Ref: <span className="font-mono">{order.ref_supplier}</span></p>
          )}
        </SheetHeader>

        <div className="space-y-5">
          {/* Status + billed */}
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-lg px-3 py-1 text-sm font-medium ${STATUS_COLORS[order.statut] ?? 'bg-gray-100 text-gray-700'}`}>
              {STATUS_LABELS[order.statut] ?? `Status ${order.statut}`}
            </span>
            <Badge variant={order.billed === '1' ? 'default' : 'secondary'}>
              {order.billed === '1' ? 'Billed' : 'Unbilled'}
            </Badge>
          </div>

          {/* Key fields */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Supplier</p>
              <p className="font-medium">{order.supplier_name || `ID:${order.socid}`}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Project</p>
              <p className="font-medium font-mono text-xs">{order.project_ref || '—'}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Order Date</p>
              <p className="font-medium">{formatDate(order.date_commande)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
              <p className="font-medium">{formatDate(order.date_livraison)}</p>
            </div>
          </div>

          {/* Amounts */}
          <div className="rounded-xl border p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total HT</span>
              <span className="tabular-nums font-mono">{formatAmount(order.total_ht)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT</span>
              <span className="tabular-nums font-mono">{formatAmount(order.total_tva)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total TTC</span>
              <span className="tabular-nums font-mono">{formatAmount(order.total_ttc)}</span>
            </div>
          </div>

          {/* Note */}
          {order.note_public && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-800">
              {order.note_public as string}
            </div>
          )}

          {/* Linked Invoices */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Linked Invoices
              {invoices.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">({invoices.length})</span>
              )}
            </h4>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg border px-4 py-3">No linked invoices found.</p>
            ) : (
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-xs">Ref</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Supplier Ref</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Amount TTC</th>
                    <th className="px-3 py-2 text-center font-medium text-xs">Status</th>
                  </tr></thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.dolibarr_id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono text-xs">{inv.ref}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{inv.ref_supplier ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-mono text-xs">{fmtSAR(inv.total_ttc)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {inv.is_paid ? 'Paid' : 'Outstanding'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Open in Dolibarr */}
          <a
            href={`https://ots.hexasteel.sa/dolibarr/index.php?id=${order.id}&module=fournisseur&action=view&mainmenu=fournisseur&leftmenu=orders_suppliers`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> Open in Dolibarr
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 0, limit: 50, total: 0, hasMore: false });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/dolibarr/purchase-orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
        setPagination(data.pagination ?? { page, limit: pageSize, total: 0, hasMore: false });
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Debounce search input so we don't fire on every keystroke
  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(0);
    }, 400);
  }

  const filtered = statusFilter
    ? orders.filter(o => o.statut === statusFilter)
    : orders;

  return (
    <div className="space-y-3 p-4 md:p-6">
      {/* Header + filters */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex items-center gap-2 shrink-0 mr-2">
          <ShoppingCart className="size-5" />
          <h1 className="text-xl font-bold whitespace-nowrap">Purchase Orders</h1>
        </div>

        {/* Status filter */}
        <div className="w-44">
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search — server-side */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Search (all pages)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-9 pl-9"
              placeholder="Search by ref, supplier, project…"
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {(searchInput || statusFilter) && (
          <Button variant="ghost" size="sm" className="h-9 self-end" onClick={() => {
            setSearch(''); setSearchInput(''); setStatusFilter(''); setPage(0);
          }}>
            Reset
          </Button>
        )}

        {/* Page size + Dolibarr link */}
        <div className="flex items-end gap-2 ml-auto shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Show:</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <a href="https://ots.hexasteel.sa/dolibarr/index.php?mainmenu=fournisseur&leftmenu=orders_suppliers" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="size-4 mr-1" /> Open in Dolibarr
            </Button>
          </a>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {/* Pagination bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm text-muted-foreground">
              {loading ? 'Loading…' : `${filtered.length} orders shown${search ? ` for "${search}"` : ''}`}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 0 || loading} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm">Page {page + 1}</span>
              <Button variant="outline" size="sm" disabled={!pagination.hasMore || loading} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Ref</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Supplier Ref</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Supplier</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Project</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Order Date</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Delivery Date</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Billed</th>
                  <th className="text-left px-4 py-2 font-medium whitespace-nowrap">Invoices</th>
                  <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Total HT</th>
                  <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 11 }).map((__, j) => (
                        <td key={j} className="px-4 py-2"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">No purchase orders found</td>
                  </tr>
                ) : (
                  filtered.map(o => {
                    const invCount = o.linked_invoices?.length ?? 0;
                    return (
                      <tr
                        key={o.id}
                        className="border-b hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setSelected(o)}
                      >
                        <td className="px-4 py-2 font-mono text-xs font-medium text-blue-700">{o.ref}</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{o.ref_supplier || '—'}</td>
                        <td className="px-4 py-2 text-sm">{o.supplier_name || `ID:${o.socid}`}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{o.project_ref || '—'}</td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">{formatDate(o.date_commande)}</td>
                        <td className="px-4 py-2 text-xs whitespace-nowrap">{formatDate(o.date_livraison)}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.statut] ?? 'bg-gray-100 text-gray-700'}`}>
                            {STATUS_LABELS[o.statut] ?? `Status ${o.statut}`}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={o.billed === '1' ? 'default' : 'secondary'} className="text-xs">
                            {o.billed === '1' ? 'Billed' : 'Unbilled'}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          {invCount === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                              <FileText className="h-3 w-3" />{invCount} inv.
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-xs">{formatAmount(o.total_ht)}</td>
                        <td className="px-4 py-2 text-right font-mono text-xs font-medium">{formatAmount(o.total_ttc)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PoDetailSheet order={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}
