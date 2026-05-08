'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Factory, Search, ChevronRight, ShieldCheck, ShieldAlert, ShieldOff, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SupplierRow {
  dolibarr_id: number;
  name: string;
  code_supplier: string | null;
  email: string | null;
  town: string | null;
  country_code: string | null;
  approval_status: string | null;
  approval_rating: string | null;
  cost_category: string | null;
}

const STATUS_ICON = {
  APPROVED:    <ShieldCheck className="h-4 w-4 text-green-600" />,
  CONDITIONAL: <ShieldAlert className="h-4 w-4 text-amber-500" />,
  SUSPENDED:   <ShieldOff className="h-4 w-4 text-red-500" />,
};

const STATUS_STYLE: Record<string, string> = {
  APPROVED:    'bg-green-100 text-green-700',
  CONDITIONAL: 'bg-amber-100 text-amber-700',
  SUSPENDED:   'bg-red-100 text-red-700',
};

const RATING_STYLE: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-orange-100 text-orange-700',
  D: 'bg-red-100 text-red-700',
};

export function SupplierListClient() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    const res = await fetch(`/api/supply-chain/suppliers?${params}`);
    if (res.ok) {
      const j = await res.json();
      setSuppliers(j.suppliers ?? []);
      setTotal(j.total ?? 0);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpi = {
    total,
    approved:    suppliers.filter(s => s.approval_status === 'APPROVED').length,
    conditional: suppliers.filter(s => s.approval_status === 'CONDITIONAL').length,
    unrated:     suppliers.filter(s => !s.approval_status).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Factory className="h-8 w-8 text-indigo-300" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Supplier Portal</h1>
              <p className="text-slate-300 mt-1 text-sm">ISO 9001:2015 §8.4 — Approved Vendor Management · Evaluation-driven approval lifecycle</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Suppliers', value: total, icon: <Factory className="h-5 w-5 text-slate-500" />, color: 'text-slate-800' },
            { label: 'Approved', value: kpi.approved, icon: <ShieldCheck className="h-5 w-5 text-green-500" />, color: 'text-green-700' },
            { label: 'Conditional', value: kpi.conditional, icon: <ShieldAlert className="h-5 w-5 text-amber-500" />, color: 'text-amber-700' },
            { label: 'Not Evaluated', value: kpi.unrated, icon: <Shield className="h-5 w-5 text-slate-400" />, color: 'text-slate-500' },
          ].map(k => (
            <div key={k.label} className="rounded-xl border bg-card px-5 py-4 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-muted">{k.icon}</div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers by name…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={fetchData}>Refresh</Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Supplier</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Code</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Location</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Category</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium hidden sm:table-cell">Rating</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    </td>
                  </tr>
                ))
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No suppliers found{search ? ` matching "${search}"` : ''}.
                  </td>
                </tr>
              ) : suppliers.map(s => (
                <tr key={s.dolibarr_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name}</p>
                    {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {s.code_supplier
                      ? <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{s.code_supplier}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {[s.town, s.country_code].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {s.cost_category
                      ? <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s.cost_category}</span>
                      : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.approval_status ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[s.approval_status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_ICON[s.approval_status as keyof typeof STATUS_ICON]}
                        {s.approval_status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                        <Shield className="h-3 w-3" /> Not Evaluated
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {s.approval_rating ? (
                      <span className={`inline-block font-bold text-sm px-2.5 py-0.5 rounded-lg ${RATING_STYLE[s.approval_rating] ?? 'bg-slate-100 text-slate-600'}`}>
                        {s.approval_rating}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/supply-chain/suppliers/${s.dolibarr_id}`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        View <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
