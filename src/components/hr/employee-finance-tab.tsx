'use client';

/**
 * 18.10.0 — Loan & Custody management for a single employee.
 * Rendered inside the "Finance" tab on /hr/employees/[id].
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Loader2,
  Plus,
  Landmark,
  Wallet,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  ArrowRight,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type LoanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
type CustodyStatus = 'OPEN' | 'PARTIALLY_SETTLED' | 'SETTLED';

interface LoanRow {
  id: string;
  principal: string;
  installmentAmount: string;
  installmentsTotal: number;
  installmentsPaid: number;
  startDate: string;
  status: LoanStatus;
  reason: string | null;
  exceedsYearWarning: boolean;
  warningReason: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

interface CustodyRow {
  id: string;
  amount: string;
  issuedDate: string;
  reason: string;
  settledAmount: string;
  deductionAmount: string;
  status: CustodyStatus;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
}

interface Props {
  employeeId: string;
  canManageLoans: boolean;
  canManageCustodies: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function money(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function loanStatusConfig(status: LoanStatus) {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', classes: 'bg-sky-50 text-sky-700 border-sky-200', icon: <AlertCircle className="h-3.5 w-3.5" /> };
    case 'COMPLETED':
      return { label: 'Completed', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
    case 'CANCELLED':
      return { label: 'Cancelled', classes: 'bg-slate-50 text-slate-500 border-slate-200', icon: <MinusCircle className="h-3.5 w-3.5" /> };
  }
}

function custodyStatusConfig(status: CustodyStatus) {
  switch (status) {
    case 'OPEN':
      return { label: 'Open', classes: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertCircle className="h-3.5 w-3.5" /> };
    case 'PARTIALLY_SETTLED':
      return { label: 'Partial', classes: 'bg-sky-50 text-sky-700 border-sky-200', icon: <ArrowRight className="h-3.5 w-3.5" /> };
    case 'SETTLED':
      return { label: 'Settled', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
  }
}

function progressPct(paid: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((paid / total) * 100));
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmployeeFinanceTab({ employeeId, canManageLoans, canManageCustodies }: Props) {
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [custodies, setCustodies] = useState<CustodyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lRes, cRes] = await Promise.all([
        fetch(`/api/hr/loans?employeeId=${employeeId}`),
        fetch(`/api/hr/custodies?employeeId=${employeeId}`),
      ]);
      if (!lRes.ok) throw new Error(`Loans: ${lRes.status}`);
      if (!cRes.ok) throw new Error(`Custodies: ${cRes.status}`);
      setLoans(await lRes.json());
      setCustodies(await cRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading finance records…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Failed to load finance records: {error}
      </div>
    );
  }

  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const totalLoanBalance = activeLoans.reduce((s, l) => {
    const remaining = l.installmentsTotal - l.installmentsPaid;
    return s + remaining * parseFloat(l.installmentAmount);
  }, 0);
  const openCustodiesBalance = custodies
    .filter((c) => c.status !== 'SETTLED')
    .reduce((s, c) => s + parseFloat(c.amount) - parseFloat(c.settledAmount), 0);

  return (
    <div className="space-y-8">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiTile label="Active Loans" value={activeLoans.length.toString()} tone="sky" />
        <KpiTile label="Loan Balance" value={`SAR ${money(totalLoanBalance)}`} tone="sky" sub="remaining" />
        <KpiTile label="Open Custodies" value={custodies.filter(c => c.status !== 'SETTLED').length.toString()} tone="amber" />
        <KpiTile label="Custody Balance" value={`SAR ${money(openCustodiesBalance)}`} tone="amber" sub="outstanding" />
      </div>

      {/* ── Loans ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100">
              <Landmark className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Loans</h3>
              <p className="text-xs text-slate-400">{loans.length} record{loans.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {canManageLoans && <AddLoanDialog employeeId={employeeId} onSaved={() => void load()} />}
        </div>

        {loans.length === 0 ? (
          <EmptyState icon={<Landmark className="h-8 w-8" />} message="No loans recorded for this employee." />
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => <LoanCard key={loan.id} loan={loan} canManage={canManageLoans} onAction={() => void load()} />)}
          </div>
        )}
      </section>

      {/* ── Custodies ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-100">
              <Wallet className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Custodies</h3>
              <p className="text-xs text-slate-400">{custodies.length} record{custodies.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {canManageCustodies && <AddCustodyDialog employeeId={employeeId} onSaved={() => void load()} />}
        </div>

        {custodies.length === 0 ? (
          <EmptyState icon={<Wallet className="h-8 w-8" />} message="No custodies recorded for this employee." />
        ) : (
          <div className="space-y-3">
            {custodies.map((c) => <CustodyCard key={c.id} custody={c} canManage={canManageCustodies} onAction={() => void load()} />)}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── KPI Tile ────────────────────────────────────────────────────────────────

function KpiTile({ label, value, tone, sub }: { label: string; value: string; tone: 'sky' | 'amber' | 'emerald'; sub?: string }) {
  const toneMap = {
    sky: 'from-sky-50 to-white border-sky-200 text-sky-700',
    amber: 'from-amber-50 to-white border-amber-200 text-amber-700',
    emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
  };
  return (
    <div className={cn('rounded-xl border bg-gradient-to-b p-4 shadow-sm', toneMap[tone])}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-lg font-bold mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Loan Card ────────────────────────────────────────────────────────────────

function LoanCard({ loan, canManage, onAction }: { loan: LoanRow; canManage: boolean; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const sc = loanStatusConfig(loan.status);
  const pct = progressPct(loan.installmentsPaid, loan.installmentsTotal);
  const remaining = loan.installmentsTotal - loan.installmentsPaid;
  const balance = remaining * parseFloat(loan.installmentAmount);

  async function cancel() {
    const reason = window.prompt('Reason for cancellation:');
    if (!reason) return;
    setBusy(true);
    try {
      await fetch(`/api/hr/loans/${loan.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteReason: reason }),
      });
      onAction();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('rounded-xl border p-4', loan.status === 'ACTIVE' ? 'bg-sky-50/40 border-sky-200' : 'bg-white border-slate-200')}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', sc.classes)}>
            {sc.icon} {sc.label}
          </span>
          {loan.exceedsYearWarning && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-orange-50 text-orange-700 border-orange-200">
              <AlertCircle className="h-3 w-3" /> &gt;12 months
            </span>
          )}
        </div>
        {loan.createdBy && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <User className="h-3 w-3" /> {loan.createdBy.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
        <div>
          <p className="text-slate-400">Principal</p>
          <p className="font-semibold text-slate-800">SAR {money(loan.principal)}</p>
        </div>
        <div>
          <p className="text-slate-400">Installment</p>
          <p className="font-semibold text-slate-800">SAR {money(loan.installmentAmount)}/mo</p>
        </div>
        <div>
          <p className="text-slate-400">Progress</p>
          <p className="font-semibold text-slate-800">{loan.installmentsPaid} / {loan.installmentsTotal} paid</p>
        </div>
        <div>
          <p className="text-slate-400">Balance</p>
          <p className={cn('font-semibold tabular-nums', loan.status === 'ACTIVE' ? 'text-sky-700' : 'text-slate-800')}>
            SAR {money(balance)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all', loan.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-sky-500')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="h-3 w-3" />
          Started {fmtDate(loan.startDate)}
        </div>
        {loan.reason && <span className="text-xs text-slate-500 italic truncate max-w-48">{loan.reason}</span>}
        {canManage && loan.status === 'ACTIVE' && (
          <Button size="sm" variant="ghost" className="text-xs h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={cancel} disabled={busy}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Custody Card ─────────────────────────────────────────────────────────────

function CustodyCard({ custody, canManage, onAction }: { custody: CustodyRow; canManage: boolean; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState(false);
  const [deductionInput, setDeductionInput] = useState(custody.deductionAmount);
  const sc = custodyStatusConfig(custody.status);
  const balance = parseFloat(custody.amount) - parseFloat(custody.settledAmount);
  const pct = Math.min(100, Math.round((parseFloat(custody.settledAmount) / parseFloat(custody.amount)) * 100));

  async function saveDeduction() {
    setBusy(true);
    try {
      await fetch(`/api/hr/custodies/${custody.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deductionAmount: parseFloat(deductionInput) || 0 }),
      });
      setEditingDeduction(false);
      onAction();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('rounded-xl border p-4', custody.status !== 'SETTLED' ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200')}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', sc.classes)}>
          {sc.icon} {sc.label}
        </span>
        {custody.createdBy && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <User className="h-3 w-3" /> {custody.createdBy.name}
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-slate-700 mb-2">{custody.reason}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-3">
        <div>
          <p className="text-slate-400">Total amount</p>
          <p className="font-semibold text-slate-800">SAR {money(custody.amount)}</p>
        </div>
        <div>
          <p className="text-slate-400">Settled</p>
          <p className="font-semibold text-emerald-700 tabular-nums">SAR {money(custody.settledAmount)}</p>
        </div>
        <div>
          <p className="text-slate-400">Balance</p>
          <p className={cn('font-semibold tabular-nums', custody.status !== 'SETTLED' ? 'text-amber-700' : 'text-slate-500')}>
            SAR {money(balance)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={cn('h-full rounded-full transition-all', custody.status === 'SETTLED' ? 'bg-emerald-500' : 'bg-amber-400')}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="h-3 w-3" />
          Issued {fmtDate(custody.issuedDate)}
        </div>

        {canManage && custody.status !== 'SETTLED' && (
          <div className="flex items-center gap-2">
            {editingDeduction ? (
              <>
                <span className="text-xs text-slate-600">Deduct/month:</span>
                <Input
                  value={deductionInput}
                  onChange={(e) => setDeductionInput(e.target.value)}
                  className="w-24 h-7 text-xs"
                  placeholder="0.00"
                />
                <Button size="sm" className="h-7 text-xs" onClick={saveDeduction} disabled={busy}>
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDeduction(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <button
                className="text-xs text-sky-600 hover:underline"
                onClick={() => setEditingDeduction(true)}
              >
                Deduct SAR {money(custody.deductionAmount)}/mo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Loan Dialog ──────────────────────────────────────────────────────────

function AddLoanDialog({ employeeId, onSaved }: { employeeId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    principal: '',
    installmentAmount: '',
    installmentsTotal: '',
    startDate: new Date().toISOString().slice(0, 10),
    reason: '',
    exceedsYearWarning: false,
    warningReason: '',
  });
  const [error, setError] = useState<string | null>(null);

  const totalMonths = parseInt(form.installmentsTotal) || 0;
  const needsWarning = totalMonths > 12;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          principal: parseFloat(form.principal),
          installmentAmount: parseFloat(form.installmentAmount),
          installmentsTotal: parseInt(form.installmentsTotal),
          startDate: form.startDate,
          reason: form.reason || undefined,
          exceedsYearWarning: needsWarning,
          warningReason: needsWarning ? form.warningReason : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      setForm({ principal: '', installmentAmount: '', installmentsTotal: '', startDate: new Date().toISOString().slice(0, 10), reason: '', exceedsYearWarning: false, warningReason: '' });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const previewBalance = (parseFloat(form.installmentAmount) || 0) * (parseInt(form.installmentsTotal) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New loan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New employee loan</DialogTitle>
          <DialogDescription>
            Loan installments will be deducted automatically in each payroll run.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-slate-600">Principal (SAR)</Label>
            <Input value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} placeholder="0.00" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Monthly installment (SAR)</Label>
            <Input value={form.installmentAmount} onChange={(e) => setForm({ ...form, installmentAmount: e.target.value })} placeholder="0.00" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Total installments (months)</Label>
            <Input value={form.installmentsTotal} onChange={(e) => setForm({ ...form, installmentsTotal: e.target.value })} placeholder="12" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Start date</Label>
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1" />
          </div>
          {previewBalance > 0 && (
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-sky-50 border border-sky-100 px-4 py-2.5">
              <span className="text-xs font-medium text-sky-700">Total loan value</span>
              <span className="text-sm font-bold text-sky-800 tabular-nums">SAR {money(previewBalance)}</span>
            </div>
          )}
          {needsWarning && (
            <div className="col-span-2">
              <Label className="text-xs font-medium text-orange-600">Warning reason required (loan &gt; 12 months)</Label>
              <Input value={form.warningReason} onChange={(e) => setForm({ ...form, warningReason: e.target.value })} placeholder="Reason for extended loan term…" className="mt-1 border-orange-200 focus:border-orange-400" />
            </div>
          )}
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Reason (optional)</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="mt-1" />
          </div>
          {error && (
            <div className="col-span-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.principal || !form.installmentAmount || !form.installmentsTotal || (needsWarning && !form.warningReason)}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save loan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Custody Dialog ────────────────────────────────────────────────────────

function AddCustodyDialog({ employeeId, onSaved }: { employeeId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    issuedDate: new Date().toISOString().slice(0, 10),
    reason: '',
    deductionAmount: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/custodies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          amount: parseFloat(form.amount),
          issuedDate: form.issuedDate,
          reason: form.reason,
          deductionAmount: parseFloat(form.deductionAmount) || 0,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      setForm({ amount: '', issuedDate: new Date().toISOString().slice(0, 10), reason: '', deductionAmount: '', notes: '' });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New custody
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New custody</DialogTitle>
          <DialogDescription>
            Record a cash advance or company asset issued to this employee.
            Set a monthly deduction amount to recover it via payroll.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-slate-600">Amount (SAR)</Label>
            <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Issued date</Label>
            <Input type="date" value={form.issuedDate} onChange={(e) => setForm({ ...form, issuedDate: e.target.value })} className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Cash advance, equipment, …" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Monthly deduction (SAR)</Label>
            <Input value={form.deductionAmount} onChange={(e) => setForm({ ...form, deductionAmount: e.target.value })} placeholder="0.00 (set later)" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Notes (optional)</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1" />
          </div>
          {error && (
            <div className="col-span-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.amount || !form.reason}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save custody
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
