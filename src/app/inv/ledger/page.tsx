'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Download, ArrowUpCircle, ArrowDownCircle, BookOpen, RefreshCw,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface LedgerEntry {
  id: string;
  createdAt: string;
  direction: 'IN' | 'OUT';
  movementType: string;
  quantity: number;
  balanceAfter: number;
  referenceNo: string | null;
  projectId: string | null;
  item: { code: string; name: string; unit: string };
  warehouse: { code: string; name: string; siteId: string };
  location?: { name: string } | null;
  performedBy: { name: string };
}

const MOVEMENT_LABELS: Record<string, string> = {
  STOCK_IN: 'Stock In',
  ISSUE: 'Issue',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
};

const MOVEMENT_COLORS: Record<string, string> = {
  STOCK_IN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  ISSUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  RETURN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  ADJUSTMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
};

type SortDir = 'asc' | 'desc' | null;
interface SortState { key: string; dir: SortDir }

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: '', dir: null });

  const [movementType, setMovementType] = useState('ALL');
  const [direction, setDirection] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');

  const PAGE_SIZE = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (movementType !== 'ALL') params.set('movementType', movementType);
      if (direction !== 'ALL') params.set('direction', direction);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/inv/ledger?${params}`);
      const data = await res.json();
      setEntries(data?.entries ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, movementType, direction, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = (key: string) => {
    setSort(prev => ({
      key,
      dir: prev.key === key ? (prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc') : 'asc',
    }));
  };

  const filteredEntries = entries
    .filter(e => {
      if (!warehouseSearch) return true;
      return e.warehouse.code.toLowerCase().includes(warehouseSearch.toLowerCase());
    })
    .sort((a, b) => {
      if (!sort.key || !sort.dir) return 0;
      let av: string | number = '';
      let bv: string | number = '';
      if (sort.key === 'createdAt') { av = a.createdAt; bv = b.createdAt; }
      if (sort.key === 'movementType') { av = a.movementType; bv = b.movementType; }
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

  const exportToExcel = () => {
    const rows = filteredEntries.map(e => ({
      'Date': new Date(e.createdAt).toLocaleDateString('en-SA-u-ca-gregory'),
      'Reference': e.referenceNo || '',
      'Item Code': e.item.code,
      'Item Name': e.item.name,
      'Warehouse': e.warehouse.code,
      'Site': e.warehouse.siteId,
      'Type': MOVEMENT_LABELS[e.movementType] || e.movementType,
      'Direction': e.direction,
      'Quantity': e.quantity,
      'Unit': e.item.unit,
      'Balance After': e.balanceAfter,
      'Location': e.location?.name || '',
      'Project': e.projectId || '',
      'Performed By': e.performedBy?.name || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    XLSX.writeFile(wb, `inv-ledger-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white">
        <div className="px-6 py-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <BookOpen className="h-5 w-5 opacity-70" />
                <span className="text-purple-200 text-xs font-medium uppercase tracking-wider">Inventory › Stock Ledger</span>
              </div>
              <h1 className="text-2xl font-bold">Stock Ledger</h1>
              <p className="text-purple-200 text-sm mt-1">
                Immutable record of all inventory movements — {loading ? '…' : `${total.toLocaleString()} entries`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={fetchData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={exportToExcel}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filters</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={movementType} onValueChange={v => { setMovementType(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Movement Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="STOCK_IN">Stock In</SelectItem>
                  <SelectItem value="ISSUE">Issue</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                </SelectContent>
              </Select>
              <Select value={direction} onValueChange={v => { setDirection(v); setPage(1); }}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Direction" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="IN">↑ IN only</SelectItem>
                  <SelectItem value="OUT">↓ OUT only</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-[145px]"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                />
                <span className="text-muted-foreground text-sm">→</span>
                <Input
                  type="date"
                  className="w-[145px]"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1); }}
                />
              </div>
              <Input
                placeholder="Filter by warehouse…"
                className="w-[180px]"
                value={warehouseSearch}
                onChange={e => setWarehouseSearch(e.target.value)}
              />
              {(movementType !== 'ALL' || direction !== 'ALL' || dateFrom || dateTo || warehouseSearch) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => { setMovementType('ALL'); setDirection('ALL'); setDateFrom(''); setDateTo(''); setWarehouseSearch(''); setPage(1); }}
                >
                  Clear all
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortableHeader col="createdAt" label="Date & Time" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Reference</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Item</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Warehouse</TableHead>
                  <SortableHeader col="movementType" label="Movement" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Dir</TableHead>
                  <SortableHeader col="quantity" label="Quantity" className="text-right" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Balance After</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin opacity-50" />
                        <span className="text-sm">Loading ledger…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No ledger entries found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map(entry => (
                    <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('en-SA-u-ca-gregory', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                        <div className="text-xs">
                          {new Date(entry.createdAt).toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-blue-700 dark:text-blue-400">
                          {entry.referenceNo || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold">{entry.item.code}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">{entry.item.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{entry.warehouse.code}</div>
                        <div className="text-xs text-muted-foreground">{entry.warehouse.siteId}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MOVEMENT_COLORS[entry.movementType] || 'bg-gray-100 text-gray-700'}`}>
                          {MOVEMENT_LABELS[entry.movementType] || entry.movementType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {entry.direction === 'IN'
                            ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                            : <ArrowDownCircle className="h-4 w-4 text-red-500" />
                          }
                          <span className={`text-xs font-semibold ${entry.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {entry.direction}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono text-sm font-bold ${entry.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {entry.direction === 'IN' ? '+' : '−'}{entry.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{entry.item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm font-semibold">{entry.balanceAfter}</span>
                        <span className="text-xs text-muted-foreground ml-1">{entry.item.unit}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[100px] truncate">
                        {entry.performedBy?.name?.split(' ')[0]}
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
              Showing <span className="font-medium">{from}–{to}</span> of <span className="font-medium">{total.toLocaleString()}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
