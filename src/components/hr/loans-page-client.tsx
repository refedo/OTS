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
  Loader2, Landmark, Search, Clock, CheckCircle2, MinusCircle, User,
  ChevronUp, ChevronDown, ChevronsUpDown, Plus, AlertTriangle, Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface EmpOption { id: string; fullNameEn: string; employmentId: string; }

function money(v: string | number) {
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function loanStatusBadge(status: LoanStatus) {
  if (status === 'ACTIVE') return <Badge className="bg-sky-100 text-sky-700 border-sky-200 border"><Clock className="h-3 w-3 mr-1" />Active</Badge>;
  if (status === 'COMPLETED') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
  return <Badge className="bg-slate-100 text-slate-500 border-slate-200 border"><MinusCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
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

// ─── New Loan Dialog ──────────────────────────────────────────────────────────

function NewLoanDialog({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [employees, setEmployees] = useState<EmpOption[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [empDropOpen, setEmpDropOpen] = useState(false);

  const [principal, setPrincipal] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentsTotal, setInstallmentsTotal] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [warningReason, setWarningReason] = useState('');

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
    setPrincipal(''); setInstallmentAmount(''); setInstallmentsTotal('');
    setStartDate(new Date().toISOString().slice(0, 10));
    setReason(''); setWarningReason(''); setError('');
  }

  const filteredEmps = empSearch.trim()
    ? employees.filter(e =>
        e.fullNameEn.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.employmentId.toLowerCase().includes(empSearch.toLowerCase())
      ).slice(0, 15)
    : employees.slice(0, 15);

  const exceedsYear = Number(installmentsTotal) > 12;

  async function handleSave() {
    if (!selectedEmpId) { setError('Please select an employee'); return; }
    if (!principal || Number(principal) <= 0) { setError('Enter a valid principal amount'); return; }
    if (!installmentAmount || Number(installmentAmount) <= 0) { setError('Enter a valid installment amount'); return; }
    if (!installmentsTotal || Number(installmentsTotal) < 1) { setError('Enter number of installments'); return; }
    if (exceedsYear && !warningReason.trim()) { setError('Provide a reason since loan exceeds 12 months'); return; }

    setSaving(true); setError('');
    try {
      const res = await fetch('/api/hr/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          principal: Number(principal),
          installmentAmount: Number(installmentAmount),
          installmentsTotal: Number(installmentsTotal),
          startDate,
          reason: reason.trim() || undefined,
          exceedsYearWarning: exceedsYear,
          warningReason: exceedsYear ? warningReason.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create loan'); return; }
      onSaved(); onClose(); reset();
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-sky-600" />New Loan
          </DialogTitle>
          <DialogDescription>Register a new employee loan for monthly payroll deduction.</DialogDescription>
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
                className="pr-8"
              />
              {empDropOpen && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredEmps.map(e => (
                    <button key={e.id} type="button"
                      className={cn('w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between', selectedEmpId === e.id && 'bg-sky-50 text-sky-700')}
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
              <Label>Principal (SAR) *</Label>
              <Input type="number" min="0" step="0.01" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="e.g. 10000" />
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Installment (SAR) *</Label>
              <Input type="number" min="0" step="0.01" value={installmentAmount} onChange={e => setInstallmentAmount(e.target.value)} placeholder="e.g. 1000" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Number of Installments *</Label>
              <Input type="number" min="1" step="1" value={installmentsTotal} onChange={e => setInstallmentsTotal(e.target.value)} placeholder="e.g. 12" />
              {exceedsYear && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />Exceeds 12 months — requires approval
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
          </div>

          {exceedsYear && (
            <div className="space-y-1.5">
              <Label>Warning Reason (required for &gt;12 months) *</Label>
              <Textarea value={warningReason} onChange={e => setWarningReason(e.target.value)} rows={2} placeholder="Explain why the loan extends beyond 12 months…" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Reason / Notes</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Purpose of the loan…" />
          </div>

          {principal && installmentAmount && installmentsTotal && (
            <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs space-y-1">
              <p className="font-semibold text-sky-700">Summary</p>
              <p className="text-sky-600">Total: SAR {money(principal)} over {installmentsTotal} months</p>
              <p className="text-sky-600">Monthly deduction: SAR {money(installmentAmount)}</p>
            </div>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Loan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Record Payment Dialog ────────────────────────────────────────────────────

function RecordPaymentDialog({ loan, open, onClose, onSaved }: {
  loan: LoanEntry | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [paymentType, setPaymentType] = useState<'SCHEDULED' | 'ADJUSTED'>('SCHEDULED');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const scheduledAmount = loan ? money(loan.installmentAmount) : '';

  function reset() {
    setPaymentType('SCHEDULED');
    setAmount('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setError('');
  }

  async function handleSave() {
    const finalAmount = paymentType === 'SCHEDULED'
      ? Number(loan?.installmentAmount ?? 0)
      : Number(amount);

    if (!finalAmount || finalAmount <= 0) { setError('Enter a valid payment amount'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/hr/loans/${loan!.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentType, amount: finalAmount, paymentDate, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to record payment'); return; }
      onSaved(); onClose(); reset();
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-sky-600" />Record Payment
          </DialogTitle>
          <DialogDescription>
            {loan ? `Loan for ${loan.employee?.fullNameEn ?? 'employee'} — SAR ${money(loan.installmentAmount)}/mo` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment type */}
          <div className="space-y-1.5">
            <Label>Payment Type *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['SCHEDULED', 'ADJUSTED'] as const).map(type => (
                <button key={type} type="button"
                  onClick={() => setPaymentType(type)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                    paymentType === type
                      ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-sky-300',
                  )}>
                  {type === 'SCHEDULED' ? `Scheduled (SAR ${scheduledAmount})` : 'Adjusted amount'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount — only for adjusted */}
          {paymentType === 'ADJUSTED' && (
            <div className="space-y-1.5">
              <Label>Amount (SAR) *</Label>
              <Input type="number" min="0.01" step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500" />
              <p className="text-xs text-slate-500">Scheduled installment is SAR {scheduledAmount}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Payment Date *</Label>
            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes…" />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-sky-600 hover:bg-sky-700">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function LoansPageClient({ canViewAll, canManage = false }: { canViewAll: boolean; canManage?: boolean }) {
  const [loans, setLoans] = useState<LoanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [newLoanOpen, setNewLoanOpen] = useState(false);
  const [paymentLoan, setPaymentLoan] = useState<LoanEntry | null>(null);
  const toggleSort = (key: string) => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/loans/all');
      if (res.ok) setLoans(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const searched = search.trim()
      ? loans.filter((l) => {
          const q = search.toLowerCase();
          return (l.employee?.fullNameEn ?? '').toLowerCase().includes(q) ||
            (l.employee?.employmentId ?? '').toLowerCase().includes(q) ||
            (l.reason ?? '').toLowerCase().includes(q);
        })
      : loans;
    return [...searched].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (sort.key) {
        case 'employee': av = a.employee?.fullNameEn ?? ''; bv = b.employee?.fullNameEn ?? ''; break;
        case 'principal': av = Number(a.principal); bv = Number(b.principal); break;
        case 'balance': av = (a.installmentsTotal - a.installmentsPaid) * Number(a.installmentAmount); bv = (b.installmentsTotal - b.installmentsPaid) * Number(b.installmentAmount); break;
        case 'startDate': av = a.startDate; bv = b.startDate; break;
        case 'status': av = a.status; bv = b.status; break;
        default: av = a.createdAt; bv = b.createdAt;
      }
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [loans, search, sort]);

  const activeLoans = useMemo(() => loans.filter((l) => l.status === 'ACTIVE'), [loans]);
  const completedLoans = useMemo(() => loans.filter((l) => l.status === 'COMPLETED'), [loans]);
  const activeBalance = useMemo(() => activeLoans.reduce((s, l) => {
    return s + (l.installmentsTotal - l.installmentsPaid) * Number(l.installmentAmount);
  }, 0), [activeLoans]);
  const totalPrincipal = useMemo(() => loans.reduce((s, l) => s + Number(l.principal), 0), [loans]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{canViewAll ? 'Employee Loans' : 'My Loans'}</h1>
                <p className="text-sky-100 text-sm mt-0.5">
                  {canViewAll ? 'Track and manage employee loan balances and monthly deductions.' : 'Your active and completed loans.'}
                </p>
              </div>
            </div>
            {canManage && (
              <Button
                onClick={() => setNewLoanOpen(true)}
                className="bg-white text-sky-700 hover:bg-sky-50 font-medium shadow-sm shrink-0"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />New Loan
              </Button>
            )}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Total Loans</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{loans.length}</p>
            <p className="text-xs text-sky-500 mt-0.5">all time</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Active</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{activeLoans.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">ongoing deductions</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Outstanding</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">SAR {money(activeBalance)}</p>
            <p className="text-xs text-emerald-500 mt-0.5">remaining balance</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{completedLoans.length}</p>
            <p className="text-xs text-violet-500 mt-0.5">fully repaid</p>
          </div>
        </div>

        {/* Table */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 gap-3 flex-wrap px-6 py-4">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-sky-600" />Loan Records
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
                <Button size="sm" className="h-8 bg-sky-600 hover:bg-sky-700 text-white" onClick={() => setNewLoanOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />New Loan
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground p-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading loans…
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Landmark className="h-10 w-10 text-slate-200 mx-auto" />
                <p className="text-sm text-muted-foreground">{search ? 'No loans match your search.' : 'No loans found.'}</p>
                {canManage && !search && (
                  <Button variant="outline" size="sm" onClick={() => setNewLoanOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Register First Loan
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50 border-b">
                    <tr>
                      {canViewAll && <SortTh col="employee" label="Employee" sort={sort} onSort={toggleSort} />}
                      <SortTh col="principal" label="Principal" sort={sort} onSort={toggleSort} />
                      <th className="py-3 px-4 font-medium">Installment</th>
                      <th className="py-3 px-4 font-medium text-right">Progress</th>
                      <SortTh col="balance" label="Balance" sort={sort} onSort={toggleSort} align="right" />
                      <SortTh col="startDate" label="Start" sort={sort} onSort={toggleSort} />
                      <SortTh col="status" label="Status" sort={sort} onSort={toggleSort} />
                      {canViewAll && <th className="py-3 px-4 font-medium">Actions</th>}
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
                          {canViewAll && (
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                {canManage && loan.status === 'ACTIVE' && (
                                  <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:text-emerald-800"
                                    onClick={() => setPaymentLoan(loan)}>
                                    <Banknote className="h-3 w-3 mr-1" />Pay
                                  </Button>
                                )}
                                {loan.employee && (
                                  <Link href={`/hr/employees/${loan.employee.id}?tab=finance`}>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-sky-600 hover:text-sky-800">Details</Button>
                                  </Link>
                                )}
                              </div>
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

      <NewLoanDialog open={newLoanOpen} onClose={() => setNewLoanOpen(false)} onSaved={load} />
      <RecordPaymentDialog
        loan={paymentLoan}
        open={paymentLoan !== null}
        onClose={() => setPaymentLoan(null)}
        onSaved={load}
      />
    </div>
  );
}
