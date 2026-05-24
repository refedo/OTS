'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
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

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [movementType, setMovementType] = useState('ALL');
  const [direction, setDirection] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseSearch, setWarehouseSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' });
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

  const filteredEntries = entries.filter(e => {
    if (!warehouseSearch) return true;
    return e.warehouse.code.toLowerCase().includes(warehouseSearch.toLowerCase());
  });

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Ledger</h1>
          <p className="text-muted-foreground text-sm mt-1">Immutable record of all inventory movements — {total} entries</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* Filters */}
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
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Direction" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="IN">↑ IN</SelectItem>
            <SelectItem value="OUT">↓ OUT</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-auto" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} placeholder="From date" />
        <Input type="date" className="w-auto" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} placeholder="To date" />
        <Input placeholder="Filter by warehouse..." className="w-[180px]" value={warehouseSearch} onChange={e => setWarehouseSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Actor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No ledger entries found</TableCell></TableRow>
              ) : (
                filteredEntries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{entry.referenceNo || '—'}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{entry.item.code}</div>
                      <div className="text-xs text-muted-foreground">{entry.item.name}</div>
                    </TableCell>
                    <TableCell className="text-sm">{entry.warehouse.code}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {MOVEMENT_LABELS[entry.movementType] || entry.movementType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {entry.direction === 'IN'
                          ? <ArrowUpCircle className="h-4 w-4 text-green-500" />
                          : <ArrowDownCircle className="h-4 w-4 text-red-500" />
                        }
                        <span className={`text-xs font-medium ${entry.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.direction}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {entry.direction === 'IN' ? '+' : '-'}{entry.quantity} {entry.item.unit}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {entry.balanceAfter} {entry.item.unit}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{entry.performedBy?.name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 50 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
