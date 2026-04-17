'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2, Wallet, Search, Clock, CheckCircle2, MinusCircle, User,
  ChevronUp, ChevronDown, ChevronsUpDown, Plus,
} from 'lucide-react';
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

interface EmpOption { id: string; fullNameEn: string; employmentId: string; }

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

// ─── New Custody Dialog ───────────────────────────────────────────────────────

function NewCustodyDialog({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [employees, setEmployees] = useState<EmpOption[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [empDropOpen, setEmpDropOpen] = useState(false);

  const [amount, setAmount] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('0');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/hr/employees?status=ACTIVE&limit=500')
      .then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d : (d.employees ?? [])))
      .catch(() => {});
  }, [open]);

  function reset() {
    setEmpSearch(''); setSelectedEmpId(''); setSelectedEmpName(''); setEmpDropOpen(false);
    setAmount(''); setIssuedDate(new Date().toISOString().slice(0, 10));
    setReason(''); setDeductionAmount('0'); setNotes(''); setError('');
  }

  const filteredEmps = empSearch.trim()
    ? employees.filter(e =>
        e.fullNameEn.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.employmentId.toLowerCase().includes(empSearch.toLowerCase())
      ).slice(0, 15)
    : employees.slice(0, 15);

  async function handleSave() {
    if (!selectedEmpId) { setError('Please select an employee'); return; }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (!reason.trim()) { setError('Reason is required'); return; }

    setSaving(true); setError('');
    try {
      const res = await fetch('/api/hr/custodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          amount: Number(amount),
          issuedDate,
          reason: reason.trim(),
          deductionAmount: Number(deductionAmount) || 0,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create custody'); return; }
      onSaved(); onClose(); reset();
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-violet-600" />New Custody
          </DialogTitle>
          <DialogDescription>Issue a cash advance or assign a company asset custody to an employee.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee picker */}
          <div className="space-y-1.5">
            <Label>Employee *</Label>
            <div className="relative">
              <Input
                placeholder="Search employee…"
                value={selectedEmpName || empSearch}
                onFocus={() => { setEmpDropOpen(true); if (selectedEmpName) { setSelectedEmpId(''); setSelectedEmpName(''); setEmpSearch(''); } }}
                onChange={e => { setEmpSearch(e.target.value); setEmpDropOpen(true); }}
              />
              {empDropOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredEmps.map(e => (
                    <button key={e.id} type="button"
                      className={cn('w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between', selectedEmpId === e.id && 'bg-violet-50 text-violet-700')}
                      onMouseDown={ev => { ev.preventDefault(); setSelectedEmpId(e.id); setSelectedEmpName(e.fullNameEn); setEmpSearch(''); setEmpDropOpen(false); }}>
                      <span>{e.fullNameEn}</span>
                      <span className="text-xs text-slate-400">{e.employmentId}</span>
                    </button>
                  ))}
                  {filteredEmps.length === 0 && <p className="text-sm text-slate-400 px-3 py-3">No employees found</p>}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (SAR) *</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" />
            </div>
            <div className="space-y-1.5">
              <Label>Issue Date *</Label>
              <Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason / Purpose *</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Travel expenses, Equipment purchase…" />
          </div>

          <div className="space-y-1.5">
            <Label>Monthly Deduction Amount (SAR)</Label>
            <Input type="number" min="0" step="0.01" value={deductionAmount} onChange={e => setDeductionAmount(e.target.value)} placeholder="0.00" />
            <p className="text-xs text-slate-400">Amount deducted per payroll cycle. Set to 0 if no automatic deduction.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional details…" />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue Custody
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function CustodiesPageClient({ canViewAll, canManage = false }: { canViewAll: boolean; canManage?: boolean }) {
  const [custodies, setCustodies] = useState<CustodyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [newOpen, setNewOpen] = useState(false);
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
  const settledCount = useMemo(() => custodies.filter((c) => c.status === 'SETTLED').length, [custodies]);
  const totalOutstanding = useMemo(() => openCustodies.reduce((s, c) => s + (Number(c.amount) - Number(c.settledAmount)), 0), [openCustodies]);
  const totalIssued = useMemo(() => custodies.reduce((s, c) => s + Number(c.amount), 0), [custodies]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{canViewAll ? 'Employee Custodies' : 'My Custodies'}</h1>
                <p className="text-violet-100 text-sm mt-0.5">
                  {canViewAll ? 'Track cash advances, equipment and company asset custodies.' : 'Your open and settled custodies.'}
                </p>
              </div>
            </div>
            {canManage && (
              <Button
                onClick={() => setNewOpen(true)}
                className="bg-white text-violet-700 hover:bg-violet-50 font-medium shadow-sm shrink-0"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />New Custody
              </Button>
            )}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Custodies</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{custodies.length}</p>
            <p className="text-xs text-violet-500 mt-0.5">all time</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Open / Partial</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{openCustodies.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">pending recovery</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold text-rose-700 mt-1">SAR {money(totalOutstanding)}</p>
            <p className="text-xs text-rose-500 mt-0.5">remaining balance</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Settled</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{settledCount}</p>
            <p className="text-xs text-emerald-500 mt-0.5">fully recovered</p>
          </div>
        </div>

        {/* Table */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 gap-3 flex-wrap px-6 py-4">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-600" />Custody Records
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee or reason…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              {canManage && (
                <Button size="sm" className="h-8 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setNewOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />New Custody
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground p-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading custodies…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Wallet className="h-10 w-10 text-slate-200 mx-auto" />
                <p className="text-sm text-muted-foreground">{search ? 'No custodies match your search.' : 'No custodies found.'}</p>
                {canManage && !search && (
                  <Button variant="outline" size="sm" onClick={() => setNewOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Issue First Custody
                  </Button>
                )}
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
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-violet-600 hover:text-violet-800">Details</Button>
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

      <NewCustodyDialog open={newOpen} onClose={() => setNewOpen(false)} onSaved={load} />
    </div>
  );
}
