'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface MirOut {
  id: string;
  mirOutNumber: string;
  materialType: string;
  siteId: string;
  status: string;
  createdAt: string;
  requestedBy: { name: string };
  location: { name: string };
  _count: { lines: number };
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'default' },
  APPROVED: { label: 'Approved', variant: 'default' },
  ISSUED: { label: 'Issued', variant: 'default' },
  PARTIALLY_ISSUED: { label: 'Partial', variant: 'default' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  CLOSED: { label: 'Closed', variant: 'outline' },
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ISSUED: 'bg-green-100 text-green-800',
  PARTIALLY_ISSUED: 'bg-teal-100 text-teal-800',
  REJECTED: 'bg-red-100 text-red-800',
  CLOSED: 'bg-slate-100 text-slate-700',
};

export default function MirOutListPage() {
  const [mirOuts, setMirOuts] = useState<MirOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('materialType', typeFilter);
      if (siteFilter !== 'ALL') params.set('siteId', siteFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/inv/mir-out?${params}`);
      const data = await res.json();
      setMirOuts(data?.mirOuts ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setMirOuts([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, siteFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Material Issue Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">HEXA-FRM-029 — {total} total requests</p>
        </div>
        <Button asChild>
          <Link href="/inv/mir-out/new">
            <Plus className="h-4 w-4 mr-2" />
            New Material Issue Request
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by number..." className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
            <SelectItem value="PARTIALLY_ISSUED">Partially Issued</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
            <SelectItem value="CONSUMABLE">Consumable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={siteFilter} onValueChange={v => { setSiteFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Factory" /></SelectTrigger>
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
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : mirOuts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No requests found</TableCell></TableRow>
              ) : (
                mirOuts.map(m => (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/inv/mir-out/${m.id}`} className="font-mono font-medium text-primary hover:underline text-sm">
                        {m.mirOutNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {m.materialType === 'RAW_MATERIAL' ? 'Raw Material' : 'Consumable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">F{m.siteId.replace('F', '')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.location?.name}</TableCell>
                    <TableCell className="text-sm">{m.requestedBy?.name}</TableCell>
                    <TableCell className="text-sm text-center">{m._count?.lines ?? 0}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[m.status] || 'bg-gray-100'}`}>
                        {STATUS_BADGE[m.status]?.label || m.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('en-SA-u-ca-gregory', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
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
