'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

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
  return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(val: string | number | null | undefined): string {
  if (val == null || val === '') return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 0, limit: 50, total: 0, hasMore: false });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      const res = await fetch(`/api/dolibarr/purchase-orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
        setPagination(data.pagination ?? { page, limit: pageSize, total: 0, hasMore: false });
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o => {
    if (statusFilter && o.statut !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.ref?.toLowerCase().includes(q) ||
        (o.ref_supplier ?? '').toLowerCase().includes(q) ||
        (o.supplier_name ?? '').toLowerCase().includes(q) ||
        (o.project_ref ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3 p-4 md:p-6">
      {/* Header + filters in one row */}
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

        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground mb-1 block">Search</label>
          <Input
            className="h-9"
            placeholder="Search ref, supplier, project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {(search || statusFilter) && (
          <Button variant="ghost" size="sm" className="h-9 self-end" onClick={() => { setSearch(''); setStatusFilter(''); }}>
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
              {loading ? 'Loading…' : `${filtered.length} orders shown`}
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
                  <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Total HT</th>
                  <th className="text-right px-4 py-2 font-medium whitespace-nowrap">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 10 }).map((__, j) => (
                        <td key={j} className="px-4 py-2"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No purchase orders found</td>
                  </tr>
                ) : (
                  filtered.map(o => (
                    <tr key={o.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs font-medium">{o.ref}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{o.ref_supplier || '—'}</td>
                      <td className="px-4 py-2">{o.supplier_name || `ID:${o.socid}`}</td>
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
                      <td className="px-4 py-2 text-right font-mono text-xs">{formatAmount(o.total_ht)}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs font-medium">{formatAmount(o.total_ttc)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
