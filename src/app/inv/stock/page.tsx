'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Search, ArrowUpCircle, ArrowDownCircle, Package, AlertTriangle, TrendingDown, RefreshCw, SlidersHorizontal, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ItemCombobox } from '@/components/inv/item-combobox';
import type { InvItem } from '@/components/inv/item-combobox';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useToast } from '@/hooks/use-toast';

interface BalanceRow {
  warehouseId: string;
  warehouse: { id: string; code: string; name: string; type: string; siteId: string; siteName: string };
  itemId: string;
  item: { id: string; code: string; name: string; unit: string; category: string; minStockLevel: number };
  quantity: number;
  isLowStock: boolean;
  updatedAt: string;
}

interface LedgerEntry {
  id: string;
  createdAt: string;
  direction: 'IN' | 'OUT';
  movementType: string;
  quantity: number;
  balanceAfter: number;
  referenceNo: string | null;
  performedBy: { name: string };
}

interface InvWarehouse {
  id: string;
  code: string;
  name: string;
  type: string;
  siteId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  STRUCTURAL_STEEL: 'Structural Steel',
  PLATE: 'Plate',
  PIPE: 'Pipe',
  CONSUMABLE: 'Consumable',
  FASTENER: 'Fastener',
  PAINT: 'Paint',
  ELECTRICAL: 'Electrical',
  OFFCUT: 'Off-cut',
  OTHER: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  STRUCTURAL_STEEL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PLATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PIPE: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  CONSUMABLE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  FASTENER: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  PAINT: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  ELECTRICAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  OFFCUT: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

type SortDir = 'asc' | 'desc' | null;
interface SortState { key: string; dir: SortDir }

export default function StockPage() {
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const canAdjust = permissions.includes('inv.adjust') || permissions.includes('inv.admin');

  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState<BalanceRow | null>(null);
  const [itemLedger, setItemLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: '', dir: null });

  // Warehouse list (for dialogs)
  const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);

  // Stock Correction dialog
  const [corrOpen, setCorrOpen] = useState(false);
  const [corrItem, setCorrItem] = useState<InvItem | null>(null);
  const [corrWarehouseId, setCorrWarehouseId] = useState('');
  const [corrPhysicalQty, setCorrPhysicalQty] = useState('');
  const [corrReason, setCorrReason] = useState('');
  const [corrSystemQty, setCorrSystemQty] = useState<number | null>(null);
  const [corrSubmitting, setCorrSubmitting] = useState(false);
  const [corrError, setCorrError] = useState('');

  // Direct stock addition dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addItem, setAddItem] = useState<InvItem | null>(null);
  const [addWarehouseId, setAddWarehouseId] = useState('');
  const [addQty, setAddQty] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addRef, setAddRef] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const url = siteFilter !== 'ALL' ? `/api/inv/balance?siteId=${siteFilter}` : '/api/inv/balance';
      const res = await fetch(url);
      const data = await res.json();
      setBalances(Array.isArray(data) ? data : []);
    } catch {
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, [siteFilter]);

  useEffect(() => { fetchBalances(); }, [fetchBalances]);

  // Fetch warehouses for dialogs
  useEffect(() => {
    fetch('/api/inv/warehouses?activeOnly=true')
      .then(r => r.json())
      .then(data => setWarehouses(Array.isArray(data) ? data : []))
      .catch(() => setWarehouses([]));
  }, []);

  // Fetch system qty when correction item+warehouse selected
  useEffect(() => {
    if (!corrItem?.id || !corrWarehouseId) { setCorrSystemQty(null); return; }
    fetch(`/api/inv/balance?itemId=${corrItem.id}&warehouseId=${corrWarehouseId}`)
      .then(r => r.json())
      .then(data => {
        const rows = Array.isArray(data) ? data : [];
        const found = rows.find((r: BalanceRow) => r.warehouseId === corrWarehouseId && r.itemId === corrItem.id);
        setCorrSystemQty(found?.quantity ?? 0);
      })
      .catch(() => setCorrSystemQty(null));
  }, [corrItem, corrWarehouseId]);

  const openItemLedger = async (row: BalanceRow) => {
    setSelectedItem(row);
    setLedgerLoading(true);
    try {
      const res = await fetch(`/api/inv/ledger?itemId=${row.itemId}&warehouseId=${row.warehouseId}&pageSize=50`);
      const data = await res.json();
      setItemLedger(data?.entries ?? []);
    } catch {
      setItemLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const toggleSort = (key: string) => {
    setSort(prev => ({
      key,
      dir: prev.key === key ? (prev.dir === 'asc' ? 'desc' : prev.dir === 'desc' ? null : 'asc') : 'asc',
    }));
  };

  const filtered = balances.filter(b => {
    const q = search.toLowerCase();
    const matchesSearch = !q || b.item.code.toLowerCase().includes(q) || b.item.name.toLowerCase().includes(q) || b.warehouse.code.toLowerCase().includes(q);
    const matchesAlert = alertFilter === 'ALL' || (alertFilter === 'LOW' && b.isLowStock) || (alertFilter === 'OK' && !b.isLowStock);
    return matchesSearch && matchesAlert;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sort.key || !sort.dir) return 0;
    let av: string | number = '';
    let bv: string | number = '';
    if (sort.key === 'code') { av = a.item.code; bv = b.item.code; }
    if (sort.key === 'name') { av = a.item.name; bv = b.item.name; }
    if (sort.key === 'category') { av = a.item.category; bv = b.item.category; }
    if (sort.key === 'warehouse') { av = a.warehouse.code; bv = b.warehouse.code; }
    if (sort.key === 'qty') { av = a.quantity; bv = b.quantity; }
    if (sort.key === 'status') { av = a.isLowStock ? 0 : 1; bv = b.isLowStock ? 0 : 1; }
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

  const lowStockCount = balances.filter(b => b.isLowStock).length;

  const exportToExcel = () => {
    const rows = filtered.map(b => ({
      'Warehouse': b.warehouse.code,
      'Site': b.warehouse.siteName,
      'Item Code': b.item.code,
      'Item Name': b.item.name,
      'Category': CATEGORY_LABELS[b.item.category] || b.item.category,
      'Unit': b.item.unit,
      'Qty': b.quantity,
      'Min Level': b.item.minStockLevel,
      'Low Stock': b.isLowStock ? 'YES' : '',
      'Updated': new Date(b.updatedAt).toLocaleDateString('en-SA-u-ca-gregory'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Levels');
    XLSX.writeFile(wb, `stock-levels-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleCorrection = async () => {
    if (!corrItem?.id || !corrWarehouseId || corrPhysicalQty === '' || !corrReason.trim()) return;
    setCorrSubmitting(true);
    setCorrError('');
    try {
      const res = await fetch('/api/inv/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: corrItem.id,
          warehouseId: corrWarehouseId,
          physicalQty: parseFloat(corrPhysicalQty),
          reason: corrReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCorrError(data.error || 'Failed to submit correction'); return; }
      toast({ title: 'Stock correction submitted', description: `Adjustment recorded for ${corrItem.code}` });
      setCorrOpen(false);
      setCorrItem(null); setCorrWarehouseId(''); setCorrPhysicalQty(''); setCorrReason(''); setCorrSystemQty(null);
      fetchBalances();
    } catch {
      setCorrError('Network error. Please try again.');
    } finally {
      setCorrSubmitting(false);
    }
  };

  const handleDirectAdd = async () => {
    if (!addItem?.id || !addWarehouseId || !addQty || parseFloat(addQty) <= 0 || addNotes.length < 3) return;
    setAddSubmitting(true);
    setAddError('');
    try {
      const res = await fetch('/api/inv/stock-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: addItem.id,
          warehouseId: addWarehouseId,
          qty: parseFloat(addQty),
          notes: addNotes,
          referenceNo: addRef || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || 'Failed to add stock'); return; }
      toast({ title: 'Stock added', description: `${addQty} ${addItem.unit} added to warehouse` });
      setAddOpen(false);
      setAddItem(null); setAddWarehouseId(''); setAddQty(''); setAddNotes(''); setAddRef('');
      fetchBalances();
    } catch {
      setAddError('Network error. Please try again.');
    } finally {
      setAddSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white">
        <div className="px-6 py-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Package className="h-5 w-5 opacity-70" />
                <span className="text-slate-300 text-xs font-medium uppercase tracking-wider">Inventory › Stock Levels</span>
              </div>
              <h1 className="text-2xl font-bold">Stock Levels</h1>
              <p className="text-slate-300 text-sm mt-1">
                Current inventory balance by warehouse — {loading ? '…' : `${balances.length} items tracked`}
                {lowStockCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5" /> {lowStockCount} low stock
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {canAdjust && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Opening Stock
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => setCorrOpen(true)}
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Stock Correction
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={fetchBalances}
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
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item code, name or warehouse…"
              className="pl-9 bg-white dark:bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Factory" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Factories</SelectItem>
              <SelectItem value="F001">Factory 001</SelectItem>
              <SelectItem value="F003">Factory 003</SelectItem>
            </SelectContent>
          </Select>
          <Select value={alertFilter} onValueChange={setAlertFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Alert" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              <SelectItem value="LOW">⚠ Low Stock Only</SelectItem>
              <SelectItem value="OK">✓ Normal Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats summary */}
        {!loading && (
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">{sortedFiltered.length} items shown</span>
            {lowStockCount > 0 && (
              <span className="text-red-600 font-medium flex items-center gap-1">
                <TrendingDown className="h-4 w-4" /> {lowStockCount} below minimum
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortableHeader col="code" label="Item Code" />
                  <SortableHeader col="name" label="Name" />
                  <SortableHeader col="category" label="Category" />
                  <SortableHeader col="warehouse" label="Warehouse" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Site</TableHead>
                  <SortableHeader col="qty" label="Qty" className="text-right" />
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Min</TableHead>
                  <SortableHeader col="status" label="Status" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin opacity-50" />
                        <span className="text-sm">Loading stock levels…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No stock data found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedFiltered.map(row => (
                    <TableRow
                      key={`${row.warehouseId}-${row.itemId}`}
                      className={`cursor-pointer transition-colors hover:bg-muted/40 ${row.isLowStock ? 'bg-red-50/50 dark:bg-red-950/10' : ''}`}
                      onClick={() => openItemLedger(row)}
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">{row.item.code}</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">{row.item.name}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[row.item.category] || 'bg-gray-100 text-gray-700'}`}>
                          {CATEGORY_LABELS[row.item.category] || row.item.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{row.warehouse.code}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{row.warehouse.siteId}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-bold text-sm ${row.isLowStock ? 'text-red-600' : 'text-foreground'}`}>
                          {row.quantity.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{row.item.unit}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm text-muted-foreground">{row.item.minStockLevel.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        {row.isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" /> LOW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                            ✓ OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Slide-over */}
      <Sheet open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              {selectedItem?.item.code}
            </SheetTitle>
            <div className="text-sm text-muted-foreground">{selectedItem?.item.name}</div>
            <div className="flex gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                {selectedItem?.warehouse.code}
              </span>
              {selectedItem?.isLowStock && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Low Stock
                </span>
              )}
            </div>
          </SheetHeader>
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Movement History</h4>
            {ledgerLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading ledger…</div>
            ) : itemLedger.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No movements recorded</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Qty</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemLedger.map(entry => (
                    <TableRow key={entry.id} className="hover:bg-muted/20">
                      <TableCell className="text-xs">
                        {new Date(entry.createdAt).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {entry.direction === 'IN'
                            ? <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-500" />
                            : <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />
                          }
                          <span className="text-xs">{entry.movementType.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm font-semibold ${entry.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {entry.direction === 'IN' ? '+' : '−'}{entry.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">{entry.balanceAfter}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Stock Correction Dialog (HEXA-FRM-028) */}
      <Dialog open={corrOpen} onOpenChange={open => { setCorrOpen(open); if (!open) { setCorrItem(null); setCorrWarehouseId(''); setCorrPhysicalQty(''); setCorrReason(''); setCorrSystemQty(null); setCorrError(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-amber-600" />
              Stock Correction — HEXA-FRM-028
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Item *</Label>
              <ItemCombobox
                value={corrItem?.id ?? ''}
                onSelect={item => setCorrItem(item)}
                placeholder="Search item..."
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Select value={corrWarehouseId} onValueChange={setCorrWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {corrSystemQty !== null && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                System Qty: <span className="font-bold font-mono">{corrSystemQty}</span>
                {corrItem?.unit && ` ${corrItem.unit}`}
              </div>
            )}
            <div className="space-y-2">
              <Label>Physical Count (actual qty) *</Label>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="Enter physical count"
                value={corrPhysicalQty}
                onChange={e => setCorrPhysicalQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="Reason for correction (e.g. Physical count discrepancy, damage, etc.)"
                value={corrReason}
                onChange={e => setCorrReason(e.target.value)}
                rows={2}
              />
            </div>
            {corrError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{corrError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCorrection}
              disabled={!corrItem?.id || !corrWarehouseId || corrPhysicalQty === '' || !corrReason.trim() || corrSubmitting}
            >
              {corrSubmitting ? 'Submitting…' : 'Submit Correction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opening Balance / Direct Stock Addition Dialog (HEXA-FRM-027) */}
      <Dialog open={addOpen} onOpenChange={open => { setAddOpen(open); if (!open) { setAddItem(null); setAddWarehouseId(''); setAddQty(''); setAddNotes(''); setAddRef(''); setAddError(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              Opening Balance / Migration Stock — HEXA-FRM-027
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
              Use this form to add opening balances or migrate stock from Dolibarr or other systems.
            </p>
            <div className="space-y-2">
              <Label>Item *</Label>
              <ItemCombobox
                value={addItem?.id ?? ''}
                onSelect={item => setAddItem(item)}
                placeholder="Search item..."
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Select value={addWarehouseId} onValueChange={setAddWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity to Add *</Label>
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="0"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference No <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder="e.g. DOL-IMPORT-2026-001"
                value={addRef}
                onChange={e => setAddRef(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes / Reason *</Label>
              <Textarea
                placeholder="e.g. Migrated from Dolibarr — opening balance as of 2026-01-01"
                value={addNotes}
                onChange={e => setAddNotes(e.target.value)}
                rows={2}
              />
            </div>
            {addError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{addError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDirectAdd}
              disabled={!addItem?.id || !addWarehouseId || !addQty || parseFloat(addQty) <= 0 || addNotes.length < 3 || addSubmitting}
            >
              {addSubmitting ? 'Adding…' : 'Add Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
