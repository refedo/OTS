'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, Search, Clock, CheckCircle2, MinusCircle, User, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type CustodyStatus = 'OPEN' | 'PARTIALLY_SETTLED' | 'SETTLED';

interface CustodyEntry {
  id: string;
  amount: string;
  issuedDate: string;
  reason: string;
  settledAmount: string;
  deductionAmount: string;
  status: CustodyStatus;
  notes: string | null;
  createdAt: string;
  employee: { id: string; fullNameEn: string; employmentId: string; occupation: string | null } | null;
}

function money(v: string | number) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function custodyStatusBadge(status: CustodyStatus) {
  if (status === 'OPEN') return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
  if (status === 'PARTIALLY_SETTLED') return <Badge className="bg-sky-100 text-sky-700 border-sky-200 border"><MinusCircle className="h-3 w-3 mr-1" />Partial</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border"><CheckCircle2 className="h-3 w-3 mr-1" />Settled</Badge>;
}

function SortTh({ col, label, sort, onSort, align = 'left' }: {
  col: string; label: string;
  sort: { key: string; dir: 'asc' | 'desc' };
  onSort: (k: string) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.key === col;
  return (
    <th className={cn('py-3 px-4 font-medium cursor-pointer select-none hover:text-slate-700 hover:bg-slate-100 transition-colors', align === 'right' ? 'text-right' : 'text-left')} onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sort.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

export function CustodiesPageClient({ canViewAll }: { canViewAll: boolean }) {
  const [custodies, setCustodies] = useState<CustodyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const toggleSort = (key: string) => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/custodies/all');
      if (res.ok) setCustodies(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const searched = search.trim()
      ? custodies.filter((c) => {
          const q = search.toLowerCase();
          return (c.employee?.fullNameEn ?? '').toLowerCase().includes(q) ||
            (c.employee?.employmentId ?? '').toLowerCase().includes(q) ||
            c.reason.toLowerCase().includes(q);
        })
      : custodies;
    return [...searched].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (sort.key) {
        case 'employee': av = a.employee?.fullNameEn ?? ''; bv = b.employee?.fullNameEn ?? ''; break;
        case 'amount': av = Number(a.amount); bv = Number(b.amount); break;
        case 'outstanding': av = Number(a.amount) - Number(a.settledAmount); bv = Number(b.amount) - Number(b.settledAmount); break;
        case 'issuedDate': av = a.issuedDate; bv = b.issuedDate; break;
        case 'status': av = a.status; bv = b.status; break;
        default: av = a.createdAt; bv = b.createdAt;
      }
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [custodies, search, sort]);

  const openCustodies = useMemo(() => custodies.filter((c) => c.status === 'OPEN' || c.status === 'PARTIALLY_SETTLED'), [custodies]);
  const totalOutstanding = useMemo(() => openCustodies.reduce((s, c) => s + (Number(c.amount) - Number(c.settledAmount)), 0), [openCustodies]);
  const totalIssued = useMemo(() => custodies.reduce((s, c) => s + Number(c.amount), 0), [custodies]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{canViewAll ? 'Custodies — All Employees' : 'My Custodies'}</h1>
              <p className="text-violet-100 text-sm mt-0.5">
                {canViewAll ? 'Track cash advances and company asset custodies.' : 'Your open and settled custodies.'}
              </p>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Custodies</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{custodies.length}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Open / Partial</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{openCustodies.length}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">SAR {money(totalOutstanding)}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Issued</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">SAR {money(totalIssued)}</p>
          </div>
        </div>

        {/* Table */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 gap-3 flex-wrap px-6 py-4">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-600" />
              Custody Records
            </CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground p-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading custodies…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {search ? 'No custodies match your search.' : 'No custodies found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b">
                    <tr>
                      {canViewAll && <SortTh col="employee" label="Employee" sort={sort} onSort={toggleSort} />}
                      <th className="py-3 px-4 font-medium">Reason</th>
                      <SortTh col="amount" label="Amount" sort={sort} onSort={toggleSort} />
                      <th className="py-3 px-4 font-medium text-right">Settled</th>
                      <SortTh col="outstanding" label="Outstanding" sort={sort} onSort={toggleSort} align="right" />
                      <SortTh col="issuedDate" label="Issued" sort={sort} onSort={toggleSort} />
                      <SortTh col="status" label="Status" sort={sort} onSort={toggleSort} />
                      {canViewAll && <th className="py-3 px-4 font-medium">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const outstanding = Number(c.amount) - Number(c.settledAmount);
                      return (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50/60 transition">
                          {canViewAll && (
                            <td className="py-3 px-4">
                              {c.employee ? (
                                <Link href={`/hr/employees/${c.employee.id}`} className="hover:underline">
                                  <div className="font-medium text-slate-900">{c.employee.fullNameEn}</div>
                                  <div className="text-xs text-muted-foreground">{c.employee.employmentId}</div>
                                </Link>
                              ) : <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Unknown</span>}
                            </td>
                          )}
                          <td className="py-3 px-4 max-w-[200px]">
                            <div className="truncate text-slate-800">{c.reason}</div>
                            {c.notes && <div className="text-xs text-muted-foreground truncate">{c.notes}</div>}
                          </td>
                          <td className="py-3 px-4 font-semibold tabular-nums">SAR {money(c.amount)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-emerald-700">SAR {money(c.settledAmount)}</td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium text-rose-700">SAR {money(outstanding)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{new Date(c.issuedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="py-3 px-4">{custodyStatusBadge(c.status)}</td>
                          {canViewAll && c.employee && (
                            <td className="py-3 px-4">
                              <Link href={`/hr/employees/${c.employee.id}?tab=finance`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">View</Button>
                              </Link>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
