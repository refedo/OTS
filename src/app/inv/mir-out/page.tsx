'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ArrowRightLeft, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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

const STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT:            { label: 'Draft',            cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  PENDING_APPROVAL: { label: 'Pending Approval',  cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400' },
  APPROVED:         { label: 'Approved',          cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400' },
  ISSUED:           { label: 'Issued',            cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' },
  PARTIALLY_ISSUED: { label: 'Partial Issue',     cls: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-400' },
  REJECTED:         { label: 'Rejected',          cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' },
  CLOSED:           { label: 'Closed',            cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

const TYPE_META: Record<string, { label: string; cls: string }> = {
  RAW_MATERIAL: { label: 'Raw Material', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
  CONSUMABLE:   { label: 'Consumable',   cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
};

const PAGE_SIZE = 20;

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
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white">
        <div className="px-6 py-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <ArrowRightLeft className="h-5 w-5 opacity-70" />
                <span className="text-orange-200 text-xs font-medium uppercase tracking-wider">Inventory › Material Issues</span>
              </div>
              <h1 className="text-2xl font-bold">Material Issue Requests</h1>
              <p className="text-orange-200 text-sm mt-1">HEXA-FRM-029 — {loading ? '…' : `${total} total requests`}</p>
            </div>
            <Button asChild className="bg-white text-orange-700 hover:bg-orange-50">
              <Link href="/inv/mir-out/new">
                <Plus className="h-4 w-4 mr-2" />
                New MIR-OUT
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by MIR number…"
              className="pl-9 bg-white dark:bg-background"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[190px]"><SelectValue placeholder="Status" /></SelectTrigger>
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
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Material Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
              <SelectItem value="CONSUMABLE">Consumable</SelectItem>
            </SelectContent>
          </Select>
          <Select value={siteFilter} onValueChange={v => { setSiteFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Factory" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Factories</SelectItem>
              <SelectItem value="F001">Factory 001</SelectItem>
              <SelectItem value="F003">Factory 003</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">MIR Number</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Factory</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Location</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Requested By</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">Lines</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin opacity-50" />
                        <span className="text-sm">Loading requests…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : mirOuts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No material issue requests found</p>
                      <Button asChild variant="outline" size="sm" className="mt-3">
                        <Link href="/inv/mir-out/new"><Plus className="h-4 w-4 mr-1" /> Create First MIR</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  mirOuts.map(m => (
                    <TableRow key={m.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                      <TableCell>
                        <Link
                          href={`/inv/mir-out/${m.id}`}
                          className="font-mono font-semibold text-sm text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          {m.mirOutNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_META[m.materialType]?.cls || 'bg-gray-100 text-gray-700'}`}>
                          {TYPE_META[m.materialType]?.label || m.materialType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{m.siteId}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[130px] truncate">{m.location?.name}</TableCell>
                      <TableCell className="text-sm">{m.requestedBy?.name?.split(' ').slice(0, 2).join(' ')}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-bold">
                          {m._count?.lines ?? 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_META[m.status]?.cls || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_META[m.status]?.label || m.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
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
