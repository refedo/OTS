'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Download, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

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

export default function StockPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState<BalanceRow | null>(null);
  const [itemLedger, setItemLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

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

  const filtered = balances.filter(b => {
    const q = search.toLowerCase();
    return !q || b.item.code.toLowerCase().includes(q) || b.item.name.toLowerCase().includes(q) || b.warehouse.code.toLowerCase().includes(q);
  });

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-muted-foreground text-sm mt-1">Current inventory balance by warehouse</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by item code, name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Factory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Factories</SelectItem>
            <SelectItem value="F001">Factory 001</SelectItem>
            <SelectItem value="F003">Factory 003</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Min Level</TableHead>
                <TableHead>Alert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No stock data found</TableCell></TableRow>
              ) : (
                filtered.map(row => (
                  <TableRow
                    key={`${row.warehouseId}-${row.itemId}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openItemLedger(row)}
                  >
                    <TableCell className="font-mono text-sm font-medium">{row.item.code}</TableCell>
                    <TableCell>{row.item.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[row.item.category] || row.item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.warehouse.code}</TableCell>
                    <TableCell className="text-sm">{row.item.unit}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${row.isLowStock ? 'text-red-600' : ''}`}>
                      {row.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-mono text-sm">
                      {row.item.minStockLevel.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {row.isLowStock && (
                        <Badge variant="destructive" className="text-xs">LOW STOCK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ledger Slide-over */}
      <Sheet open={!!selectedItem} onOpenChange={open => !open && setSelectedItem(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedItem?.item.code} — {selectedItem?.warehouse.code}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{selectedItem?.item.name}</p>
          </SheetHeader>
          <div className="mt-4">
            {ledgerLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading ledger...</div>
            ) : itemLedger.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No movements recorded</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemLedger.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        {new Date(entry.createdAt).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {entry.direction === 'IN'
                            ? <ArrowUpCircle className="h-3 w-3 text-green-500" />
                            : <ArrowDownCircle className="h-3 w-3 text-red-500" />
                          }
                          <span className="text-xs">{entry.movementType.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono text-sm ${entry.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.direction === 'IN' ? '+' : '-'}{entry.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{entry.balanceAfter}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
