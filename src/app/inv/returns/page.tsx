'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Undo2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface ReturnRow {
  id: string;
  returnNumber: string;
  returnType: string;
  siteId: string;
  status: string;
  quantity: number;
  description: string | null;
  createdAt: string;
  requestedBy: { name: string };
  item: { code: string; name: string; unit: string };
  warehouse: { code: string };
  location: { name: string };
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  RECEIVED: { label: 'Received', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
};

const TYPE_META: Record<string, { label: string; cls: string }> = {
  UNUSED_STOCK: { label: 'Unused Stock', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  OFFCUT:       { label: 'Off-cut',      cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400' },
};

const PAGE_SIZE = 20;

type SortDir = 'asc' | 'desc' | null;
interface SortState { key: string; dir: SortDir }

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: '', dir: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('returnType', typeFilter);

      const res = await fetch(`/api/inv/returns?${params}`);
      const data = await res.json();
      setReturns(data?.returns ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleSort = (key: string) => {
    setSort(prev => ({
      key,
      dir: prev.key === key ? (prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc') : 'asc',
    }));
  };

  const sortedReturns = [...returns].sort((a, b) => {
    if (!sort.key || !sort.dir) return 0;
    let av: string | number = '';
    let bv: string | number = '';
    if (sort.key === 'returnNumber') { av = a.returnNumber; bv = b.returnNumber; }
    if (sort.key === 'returnType') { av = a.returnType; bv = b.returnType; }
    if (sort.key === 'status') { av = a.status; bv = b.status; }
    if (sort.key === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
    if (sort.key === 'quantity') { av = a.quantity; bv = b.quantity; }
    if (typeof av === 'string' && typeof bv === 'string') {
      return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return sort.dir === 'asc' ? av - bv : bv - av;
    }
    return 0;
  });

  const SortableHeader = ({ col, label, className }: { col: string; label: string; className?: string }) => (
    <TableHead
      className={`text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-muted/60 ${className ?? ''}`}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sort.key === col ? (sort.dir === 'asc' ? '↑' : sort.dir === 'desc' ? '↓' : '') : <span className="opacity-30">↕</span>}
      </span>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-gradient-to-r from-teal-600 via-cyan-700 to-blue-700 text-white">
        <div className="px-6 py-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Undo2 className="h-5 w-5 opacity-70" />
                <span className="text-cyan-200 text-xs font-medium uppercase tracking-wider">Inventory › Material Returns</span>
              </div>
              <h1 className="text-2xl font-bold">Material Returns</h1>
              <p className="text-cyan-200 text-sm mt-1">HEXA-FRM-030 — {loading ? '…' : `${total} total returns`}</p>
            </div>
            <Button asChild className="bg-white text-teal-700 hover:bg-teal-50">
              <Link href="/inv/returns/new">
                <Plus className="h-4 w-4 mr-2" />
                New Return
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="RECEIVED">Received</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Return Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="UNUSED_STOCK">Unused Stock</SelectItem>
              <SelectItem value="OFFCUT">Off-cut</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortableHeader col="returnNumber" label="Return Number" />
                  <SortableHeader col="returnType" label="Type" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Item</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Warehouse</TableHead>
                  <SortableHeader col="quantity" label="Quantity" className="text-right" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">From Location</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Requested By</TableHead>
                  <SortableHeader col="status" label="Status" />
                  <SortableHeader col="createdAt" label="Date" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin opacity-50" />
                        <span className="text-sm">Loading returns…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Undo2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No material returns found</p>
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <Link href="/inv/returns/new"><Plus className="h-4 w-4 mr-1" /> Create Return</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedReturns.map(r => (
                    <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">{r.returnNumber}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_META[r.returnType]?.cls || 'bg-gray-100 text-gray-700'}`}>
                          {TYPE_META[r.returnType]?.label || r.returnType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold">{r.item.code}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[140px]">{r.item.name}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{r.warehouse.code}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm font-bold">{r.quantity}</span>
                        <span className="text-xs text-muted-foreground ml-1">{r.item.unit}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{r.location?.name}</TableCell>
                      <TableCell className="text-sm">{r.requestedBy?.name?.split(' ').slice(0, 2).join(' ')}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[r.status]?.cls || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_META[r.status]?.label || r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</span> of <span className="font-medium">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
