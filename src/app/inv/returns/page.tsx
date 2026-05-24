'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Material Returns</h1>
          <p className="text-muted-foreground text-sm mt-1">HEXA-FRM-030 — {total} total returns</p>
        </div>
        <Button asChild>
          <Link href="/inv/returns/new">
            <Plus className="h-4 w-4 mr-2" /> New Return
          </Link>
        </Button>
      </div>

      <div className="flex gap-3">
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
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="UNUSED_STOCK">Unused Stock</SelectItem>
            <SelectItem value="OFFCUT">Off-cut</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>From Location</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : returns.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No returns found</TableCell></TableRow>
              ) : (
                returns.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm font-medium">{r.returnNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {r.returnType === 'UNUSED_STOCK' ? 'Unused Stock' : 'Off-cut'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{r.item.code}</div>
                      <div className="text-xs text-muted-foreground">{r.item.name}</div>
                    </TableCell>
                    <TableCell className="text-sm">{r.warehouse.code}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.quantity} {r.item.unit}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.location?.name}</TableCell>
                    <TableCell className="text-sm">{r.requestedBy?.name}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric' })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
