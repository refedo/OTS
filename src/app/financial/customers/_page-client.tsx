'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users, Search, ChevronRight, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CustomerRow {
  dolibarr_id: number;
  name: string;
  code_client: string | null;
  email: string | null;
  town: string | null;
  country_code: string | null;
  is_active: number;
}

export function CustomerListClient() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    const res = await fetch(`/api/financial/customers?${params}`);
    if (res.ok) {
      const j = await res.json();
      setCustomers(j.customers ?? []);
      setTotal(j.total ?? 0);
    }
    setLoading(false);
  }, [search, page]);

  const syncAndRefresh = useCallback(async () => {
    setSyncing(true);
    await fetch('/api/dolibarr/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: 'thirdparties' }),
    });
    await fetchData();
    setSyncing(false);
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Users className="h-8 w-8 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Customer Portal</h1>
              <p className="text-slate-300 mt-1 text-sm">Accounts Receivable · Payment Terms · Statement of Account · Projects</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Customers', value: total },
          ].map(k => (
            <div key={k.label} className="rounded-xl border bg-card px-5 py-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-muted"><Users className="h-5 w-5 text-slate-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold tabular-nums">{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={syncAndRefresh} disabled={syncing || loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync & Refresh'}
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Code</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Location</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={4} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    No customers found{search ? ` matching "${search}"` : ''}.
                  </td>
                </tr>
              ) : customers.map(c => (
                <tr key={c.dolibarr_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.name}</p>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {c.code_client
                      ? <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{c.code_client}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {[c.town, c.country_code].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/financial/customers/${c.dolibarr_id}`}>
                      <Button variant="ghost" size="sm" className="gap-1">View <ChevronRight className="h-4 w-4" /></Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
