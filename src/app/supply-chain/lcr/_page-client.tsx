'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Calendar,
  FileSpreadsheet,
  ExternalLink,
  Clock,
  Loader2,
  Info,
} from 'lucide-react';

interface LcrEntry {
  id: string;
  sheetRowId: string;
  resolutionStatus: string;
  isDeleted: boolean;
  syncedAt: string;
  sn: string | null;
  projectNumber: string | null;
  projectId: string | null;
  project: { id: string; projectNumber: string; name: string } | null;
  itemLabel: string | null;
  qty: number | null;
  amount: number | null;
  status: string | null;
  buildingNameRaw: string | null;
  buildingId: string | null;
  building: { id: string; name: string; designation: string } | null;
  mrfNumber: string | null;
  requestDate: string | null;
  neededFromDate: string | null;
  neededToDate: string | null;
  buyingDate: string | null;
  receivingDate: string | null;
  poNumber: string | null;
  dnNumber: string | null;
  awardedToRaw: string | null;
  supplierId: number | null;
  weight: number | null;
  totalWeight: number | null;
  thickness: string | null;
  targetPrice: number | null;
  totalLcr1: number | null;
  ratio1to2Lcr1: number | null;
  lcr1Amount: number | null;
  lcr1PricePerTon: number | null;
  totalLcr2: number | null;
  lcr2: string | null;
  lcr2Amount: number | null;
  lcr2PricePerTon: number | null;
  lcr3: string | null;
  lcr3Amount: number | null;
  lcr3PricePerTon: number | null;
  productId: number | null;
}

interface SyncLog {
  id: string;
  status: string;
  triggeredBy: string;
  totalRows: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  rowsDeleted: number;
  pendingAliases: number;
  durationMs: number;
  errorMessage: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  'Bought': 'bg-green-100 text-green-800 border-green-200',
  'Under Request': 'bg-orange-100 text-orange-800 border-orange-200',
  'Available at factory': 'bg-blue-100 text-blue-800 border-blue-200',
  'Available at Factory': 'bg-blue-100 text-blue-800 border-blue-200',
  'Requested': 'bg-amber-100 text-amber-800 border-amber-200',
  'Ordered': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Received': 'bg-green-100 text-green-800 border-green-200',
  'Cancelled': 'bg-gray-100 text-gray-500 border-gray-200',
  'Canceled': 'bg-gray-100 text-gray-500 border-gray-200',
  'Suspended': 'bg-red-100 text-red-700 border-red-200',
  'Closed': 'bg-slate-100 text-slate-600 border-slate-200',
  'Converted to Built-Up': 'bg-purple-100 text-purple-700 border-purple-200',
  'Merged to other thickness': 'bg-violet-100 text-violet-700 border-violet-200',
  'Not available in the market': 'bg-red-100 text-red-800 border-red-200',
  'Only Price Request': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Replaced': 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatSAR(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return `SAR ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: 3 });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function isOverdue(entry: LcrEntry): boolean {
  if (!entry.neededToDate || entry.receivingDate) return false;
  if (entry.status === 'Cancelled' || entry.status === 'Received') return false;
  return new Date(entry.neededToDate) < new Date();
}

function daysOverdue(entry: LcrEntry): number {
  if (!entry.neededToDate) return 0;
  const diff = Date.now() - new Date(entry.neededToDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function LcrPage() {
  const { toast } = useToast();

  // Data state
  const [entries, setEntries] = useState<LcrEntry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LcrEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Filters
  const [projectFilter, setProjectFilter] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resolutionFilter, setResolutionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Sorting state (server-side)
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Unique values for dropdowns - fetched from all LCR data
  const [projectOptions, setProjectOptions] = useState<Array<{ id: string; number: string; name: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilter) params.set('projectId', projectFilter);
      if (buildingFilter) params.set('buildingId', buildingFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (resolutionFilter) params.set('resolutionStatus', resolutionFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (itemSearch) params.set('itemSearch', itemSearch);
      if (sortField) params.set('sortBy', sortField);
      if (sortField) params.set('sortOrder', sortDirection);
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await fetch(`/api/supply-chain/lcr?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setEntries(json.data ?? []);
      setPagination(json.pagination ?? { page: 1, limit: 50, total: 0, totalPages: 0 });
    } catch {
      toast({ title: 'Error', description: 'Failed to load LCR data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectFilter, buildingFilter, statusFilter, resolutionFilter, dateFrom, dateTo, itemSearch, page, pageSize, sortField, sortDirection, toast]);

  // Fetch all unique projects from LCR data (not just current page)
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/supply-chain/lcr/projects');
      if (res.ok) {
        const data = await res.json();
        setProjectOptions(data);
      }
    } catch {
      // non-critical
    }
  }, []);

  // Fetch all unique statuses from LCR data
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/supply-chain/lcr/statuses');
      if (res.ok) {
        const data = await res.json();
        setStatusOptions(data);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchSyncLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/supply-chain/lcr/sync-logs');
      if (res.ok) {
        const logs: SyncLog[] = await res.json();
        if (logs.length > 0) setLastSync(logs[0]);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { fetchData(); fetchProjects(); fetchStatuses(); fetchSyncLogs(); }, [fetchData, fetchProjects, fetchStatuses, fetchSyncLogs]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/supply-chain/lcr/sync', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: 'Sync Error', description: result.error || 'Sync failed', variant: 'destructive' });
        return;
      }
      if (result.status === 'error') {
        toast({ title: 'Sync Error', description: result.error || 'Sync failed', variant: 'destructive' });
      } else if (result.status === 'partial') {
        toast({ title: 'Sync Partial', description: `Synced with ${result.pendingAliases} pending aliases. ${result.inserted} inserted, ${result.updated} updated.` });
      } else {
        toast({ title: 'Sync Complete', description: `${result.inserted} inserted, ${result.updated} updated, ${result.deleted} deleted in ${result.durationMs}ms` });
      }
      fetchData();
      fetchSyncLogs();
    } catch {
      toast({ title: 'Sync Error', description: 'Network error during sync', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const openDetail = (entry: LcrEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-muted-foreground/40 ml-1">↕</span>;
    return sortDirection === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  const pendingCount = lastSync?.pendingAliases ?? 0;

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="size-6" />
            LCR — Least Cost Routing
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline">
              {syncing ? <Loader2 className="size-4 mr-1 animate-spin" /> : <RefreshCw className="size-4 mr-1" />}
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
            <Link href="/supply-chain/lcr/reports">
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="size-4 mr-1" /> Reports
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            {pagination.total} rows • Last synced: {lastSync ? timeAgo(lastSync.createdAt) : 'Never'}
            {pendingCount > 0 && (
              <>
                {' • '}
                <Link href="/supply-chain/lcr/aliases" className="text-orange-600 hover:underline">
                  {pendingCount} pending aliases
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-56">
          <label className="text-xs text-muted-foreground mb-1 block">Project</label>
          <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projectOptions.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.number} — {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-44">
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {statusOptions.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="text-xs text-muted-foreground mb-1 block">Needed By From</label>
          <Input type="date" className="h-9" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </div>

        <div className="w-40">
          <label className="text-xs text-muted-foreground mb-1 block">Needed By To</label>
          <Input type="date" className="h-9" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>

        <div className="flex-1 min-w-[280px]">
          <label className="text-xs text-muted-foreground mb-1 block">Search</label>
          <Input
            type="text"
            className="h-9"
            placeholder="Search items, P.O., project, building, supplier..."
            value={itemSearch}
            onChange={(e) => { setItemSearch(e.target.value); setPage(1); }}
          />
        </div>

        {(projectFilter || statusFilter || dateFrom || dateTo || itemSearch) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => { setProjectFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setItemSearch(''); setPage(1); }}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {/* Top Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Showing {entries.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show:</span>
                <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(val === 'all' ? 10000 : Number(val)); setPage(1); }}>
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-medium">Page {page} / {pagination.totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('sn')}>
                    SN<SortIcon field="sn" />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('project')}>
                    Project #<SortIcon field="project" />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('building')}>
                    Building<SortIcon field="building" />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('item')}>
                    Item<SortIcon field="item" />
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('qty')}>
                    Qty<SortIcon field="qty" />
                  </th>
                  <th className="text-right px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('amount')}>
                    Amount<SortIcon field="amount" />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('status')}>
                    Status<SortIcon field="status" />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('po')}>
                    P.O. #<SortIcon field="po" />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden lg:table-cell cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('supplier')}>
                    Awarded To<SortIcon field="supplier" />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('neededBy')}>
                    Needed By<SortIcon field="neededBy" />
                  </th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground w-12">
                    <span title="Resolution Status">Res</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-3 py-2.5"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Info className="size-8" />
                        <p className="font-medium">
                          {(projectFilter || statusFilter || dateFrom || dateTo || itemSearch)
                            ? 'No procurement entries match your filters'
                            : 'No LCR data yet'}
                        </p>
                        {!projectFilter && !statusFilter && !dateFrom && !dateTo && !itemSearch && (
                          <p className="text-xs">Click &quot;Sync Now&quot; to pull data from Google Sheets</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const overdue = isOverdue(entry);
                    const days = daysOverdue(entry);
                    return (
                      <tr
                        key={entry.id}
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => openDetail(entry)}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs">{entry.sn ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          {entry.project ? (
                            <span className="text-primary font-medium">{entry.project.projectNumber}</span>
                          ) : (
                            <span className="text-muted-foreground">{entry.projectNumber ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          {entry.building ? entry.building.name : (
                            entry.buildingNameRaw ? <span className="italic text-muted-foreground">{entry.buildingNameRaw}</span> : '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px] truncate" title={entry.itemLabel ?? undefined}>
                          {entry.itemLabel ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right hidden md:table-cell">{formatNumber(entry.qty)}</td>
                        <td className="px-3 py-2.5 text-right hidden md:table-cell">{formatSAR(entry.amount)}</td>
                        <td className="px-3 py-2.5">
                          {entry.status ? (
                            <Badge variant="outline" className={STATUS_COLORS[entry.status] ?? 'bg-gray-100 text-gray-600'}>
                              {entry.status}
                            </Badge>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell font-mono text-xs">
                          {entry.poNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 hidden lg:table-cell max-w-[150px] truncate">
                          {entry.supplierId ? (
                            <span>{entry.awardedToRaw}</span>
                          ) : entry.awardedToRaw ? (
                            <span className="italic text-muted-foreground">{entry.awardedToRaw}</span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <span className={overdue ? 'text-red-600 font-medium' : ''}>
                              {formatDate(entry.neededToDate)}
                            </span>
                            {overdue && (
                              <span className="text-xs text-red-500" title={`${days} days overdue`}>
                                ({days}d)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {entry.resolutionStatus === 'resolved' ? (
                            <CheckCircle className="size-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertTriangle className="size-4 text-amber-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-sm font-medium">Page {page} / {pagination.totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedEntry && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  LCR Entry — {selectedEntry.sn ?? selectedEntry.sheetRowId}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6">
                {/* Identity */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Identity</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-muted-foreground">SN:</span> {selectedEntry.sn ?? '—'}</div>
                    <div><span className="text-muted-foreground">Project:</span>{' '}
                      {selectedEntry.project ? (
                        <Link href={`/projects`} className="text-primary underline">{selectedEntry.project.projectNumber}</Link>
                      ) : selectedEntry.projectNumber ?? '—'}
                    </div>
                    <div><span className="text-muted-foreground">Building:</span> {selectedEntry.building?.name ?? selectedEntry.buildingNameRaw ?? '—'}</div>
                    <div><span className="text-muted-foreground">Item:</span> {selectedEntry.itemLabel ?? '—'}</div>
                    <div><span className="text-muted-foreground">Qty:</span> {formatNumber(selectedEntry.qty)}</div>
                    <div><span className="text-muted-foreground">Amount:</span> {formatSAR(selectedEntry.amount)}</div>
                    <div><span className="text-muted-foreground">Status:</span>{' '}
                      {selectedEntry.status ? (
                        <Badge variant="outline" className={STATUS_COLORS[selectedEntry.status] ?? ''}>{selectedEntry.status}</Badge>
                      ) : '—'}
                    </div>
                    <div><span className="text-muted-foreground">MRF #:</span> {selectedEntry.mrfNumber ?? '—'}</div>
                    <div><span className="text-muted-foreground">Resolution:</span>{' '}
                      {selectedEntry.resolutionStatus === 'resolved' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Resolved</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700">Pending</Badge>
                      )}
                    </div>
                  </div>
                </section>

                {/* Timeline */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Calendar className="size-4" /> Timeline
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-muted-foreground">Request Date:</span> {formatDate(selectedEntry.requestDate)}</div>
                    <div><span className="text-muted-foreground">Needed From:</span> {formatDate(selectedEntry.neededFromDate)}</div>
                    <div>
                      <span className="text-muted-foreground">Needed To:</span>{' '}
                      <span className={isOverdue(selectedEntry) ? 'text-red-600 font-medium' : ''}>
                        {formatDate(selectedEntry.neededToDate)}
                        {isOverdue(selectedEntry) && ` (${daysOverdue(selectedEntry)}d overdue)`}
                      </span>
                    </div>
                    <div><span className="text-muted-foreground">Buying Date:</span> {formatDate(selectedEntry.buyingDate)}</div>
                    <div><span className="text-muted-foreground">Receiving Date:</span> {formatDate(selectedEntry.receivingDate)}</div>
                  </div>
                </section>

                {/* Purchase */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Purchase Details</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><span className="text-muted-foreground">PO #:</span> {selectedEntry.poNumber ?? '—'}</div>
                    <div><span className="text-muted-foreground">DN #:</span> {selectedEntry.dnNumber ?? '—'}</div>
                    <div><span className="text-muted-foreground">Awarded To:</span> {selectedEntry.awardedToRaw ?? '—'}</div>
                    <div><span className="text-muted-foreground">Thickness:</span> {selectedEntry.thickness ?? '—'}</div>
                    <div><span className="text-muted-foreground">Weight:</span> {formatNumber(selectedEntry.weight)}</div>
                    <div><span className="text-muted-foreground">Total Weight:</span> {formatNumber(selectedEntry.totalWeight)}</div>
                    <div><span className="text-muted-foreground">Target Price:</span> {formatSAR(selectedEntry.targetPrice)}</div>
                  </div>
                </section>

                {/* LCR Comparison Table */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">LCR Comparison</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="text-left px-3 py-2 font-medium"></th>
                          <th className="text-left px-3 py-2 font-medium">Supplier</th>
                          <th className="text-right px-3 py-2 font-medium">Amount</th>
                          <th className="text-right px-3 py-2 font-medium">Price/Ton</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b bg-green-50/50">
                          <td className="px-3 py-2 font-medium text-green-700">LCR 1 ★</td>
                          <td className="px-3 py-2">{selectedEntry.awardedToRaw ?? '—'}</td>
                          <td className="px-3 py-2 text-right">{formatSAR(selectedEntry.lcr1Amount)}</td>
                          <td className="px-3 py-2 text-right">{formatSAR(selectedEntry.lcr1PricePerTon)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="px-3 py-2 font-medium">LCR 2</td>
                          <td className="px-3 py-2">{selectedEntry.lcr2 ?? '—'}</td>
                          <td className="px-3 py-2 text-right">{formatSAR(selectedEntry.lcr2Amount)}</td>
                          <td className="px-3 py-2 text-right">{formatSAR(selectedEntry.lcr2PricePerTon)}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium">LCR 3</td>
                          <td className="px-3 py-2">{selectedEntry.lcr3 ?? '—'}</td>
                          <td className="px-3 py-2 text-right">{formatSAR(selectedEntry.lcr3Amount)}</td>
                          <td className="px-3 py-2 text-right">{formatSAR(selectedEntry.lcr3PricePerTon)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {selectedEntry.ratio1to2Lcr1 !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      LCR1/LCR2 Ratio: {Number(selectedEntry.ratio1to2Lcr1).toFixed(4)}
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
