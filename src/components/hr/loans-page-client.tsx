'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Landmark, Search, Clock, CheckCircle2, MinusCircle, User } from 'lucide-react';
import Link from 'next/link';

type LoanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface LoanEntry {
  id: string;
  principal: string;
  installmentAmount: string;
  installmentsTotal: number;
  installmentsPaid: number;
  startDate: string;
  status: LoanStatus;
  reason: string | null;
  exceedsYearWarning: boolean;
  createdAt: string;
  employee: { id: string; fullNameEn: string; employmentId: string; occupation: string | null } | null;
}

function money(v: string | number) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function loanStatusBadge(status: LoanStatus) {
  if (status === 'ACTIVE') return <Badge className="bg-sky-100 text-sky-700 border-sky-200 border"><Clock className="h-3 w-3 mr-1" />Active</Badge>;
  if (status === 'COMPLETED') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
  return <Badge className="bg-slate-100 text-slate-500 border-slate-200 border"><MinusCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
}

export function LoansPageClient({ canViewAll }: { canViewAll: boolean }) {
  const [loans, setLoans] = useState<LoanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/loans/all');
      if (res.ok) setLoans(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter((l) =>
      (l.employee?.fullNameEn ?? '').toLowerCase().includes(q) ||
      (l.employee?.employmentId ?? '').toLowerCase().includes(q) ||
      (l.reason ?? '').toLowerCase().includes(q),
    );
  }, [loans, search]);

  const totalPrincipal = useMemo(() => loans.reduce((s, l) => s + Number(l.principal), 0), [loans]);
  const activeLoans = useMemo(() => loans.filter((l) => l.status === 'ACTIVE'), [loans]);
  const activeBalance = useMemo(() => activeLoans.reduce((s, l) => {
    return s + (l.installmentsTotal - l.installmentsPaid) * Number(l.installmentAmount);
  }, 0), [activeLoans]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{canViewAll ? 'Loans — All Employees' : 'My Loans'}</h1>
              <p className="text-sky-100 text-sm mt-0.5">
                {canViewAll ? 'View and track employee loan balances.' : 'Your active and completed loans.'}
              </p>
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total Loans</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{loans.length}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{activeLoans.length}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Outstanding Balance</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">SAR {money(activeBalance)}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Principal</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">SAR {money(totalPrincipal)}</p>
          </div>
        </div>

        {/* Table */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 gap-3 flex-wrap px-6 py-4">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-sky-600" />
              Loan Records
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
                <Loader2 className="h-4 w-4 animate-spin" /> Loading loans…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {search ? 'No loans match your search.' : 'No loans found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b">
                    <tr>
                      {canViewAll && <th className="py-3 px-4 font-medium">Employee</th>}
                      <th className="py-3 px-4 font-medium">Principal</th>
                      <th className="py-3 px-4 font-medium">Installment</th>
                      <th className="py-3 px-4 font-medium text-right">Progress</th>
                      <th className="py-3 px-4 font-medium text-right">Balance</th>
                      <th className="py-3 px-4 font-medium">Start</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      {canViewAll && <th className="py-3 px-4 font-medium">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((loan) => {
                      const remaining = (loan.installmentsTotal - loan.installmentsPaid) * Number(loan.installmentAmount);
                      const progress = loan.installmentsTotal > 0 ? (loan.installmentsPaid / loan.installmentsTotal) * 100 : 0;
                      return (
                        <tr key={loan.id} className="border-b last:border-0 hover:bg-slate-50/60 transition">
                          {canViewAll && (
                            <td className="py-3 px-4">
                              {loan.employee ? (
                                <Link href={`/hr/employees/${loan.employee.id}`} className="hover:underline">
                                  <div className="font-medium text-slate-900">{loan.employee.fullNameEn}</div>
                                  <div className="text-xs text-muted-foreground">{loan.employee.employmentId}</div>
                                </Link>
                              ) : <span className="text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Unknown</span>}
                            </td>
                          )}
                          <td className="py-3 px-4 font-semibold tabular-nums">SAR {money(loan.principal)}</td>
                          <td className="py-3 px-4 tabular-nums text-muted-foreground">SAR {money(loan.installmentAmount)}/mo</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums">{loan.installmentsPaid}/{loan.installmentsTotal}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-800">SAR {money(remaining)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{new Date(loan.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="py-3 px-4">{loanStatusBadge(loan.status)}</td>
                          {canViewAll && loan.employee && (
                            <td className="py-3 px-4">
                              <Link href={`/hr/employees/${loan.employee.id}?tab=finance`}>
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
