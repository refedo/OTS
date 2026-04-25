'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, SlidersHorizontal, CalendarDays, Plane, FileText,
  TrendingUp, Zap, Star, DollarSign, Users, AlertCircle, Loader2,
  RotateCcw, MinusCircle, Search, X, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type Employee = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  dailyRate: string;
  annualLeaveBalance: number;
  annualLeaveValue: number;
};

type Adjustment = {
  id: string;
  employeeId: string;
  employee: { id: string; employmentId: string; fullNameEn: string };
  kind: string;
  amount: string;
  reason: string;
  leaveDaysCompensated: string | null;
  createdAt: string;
  createdBy: string;
};

type Period = {
  id: string;
  year: number;
  month: number;
  status: string;
  hasLines: boolean;
  adjustments: Adjustment[];
  employees: Employee[];
};

// ── Kind configuration ─────────────────────────────────────────────────────────

type KindCfg = {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
  dot: string;
  isDeduction: boolean;
  needsDays: boolean;
};

const KIND_CFG: Record<string, KindCfg> = {
  ANNUAL_LEAVE_ALLOWANCE: { label: 'Annual Leave Allowance', icon: CalendarDays,  bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-500',    isDeduction: false, needsDays: true  },
  TICKET_ALLOWANCE:       { label: 'Ticket Allowance',       icon: Plane,          bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', isDeduction: false, needsDays: false },
  EXIT_REENTRY_VISA:      { label: 'Exit/Re-entry Visa',     icon: FileText,       bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500',  isDeduction: false, needsDays: false },
  COMMISSION:             { label: 'Commission',              icon: TrendingUp,     bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500',isDeduction: false, needsDays: false },
  INCENTIVE:              { label: 'Incentive',               icon: Zap,            bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', isDeduction: false, needsDays: false },
  BONUS:                  { label: 'Bonus',                   icon: Star,           bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-500',   isDeduction: false, needsDays: false },
  OTHER:                  { label: 'Other Addition',          icon: Plus,           bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-400',  isDeduction: false, needsDays: false },
  DEDUCTION:              { label: 'Deduction',               icon: MinusCircle,    bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    isDeduction: true,  needsDays: false },
  FINE:                   { label: 'Fine',                    icon: AlertCircle,    bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    isDeduction: true,  needsDays: false },
  ADVANCE_REPAYMENT:      { label: 'Advance Repayment',       icon: RotateCcw,      bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    isDeduction: true,  needsDays: false },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_LOCKED = (s: string) => s === 'LOCKED';

function sar(n: number | string) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KindBadge({ kind }: { kind: string }) {
  const cfg = KIND_CFG[kind] ?? KIND_CFG.OTHER;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', cfg.bg, cfg.text, cfg.border)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PayrollCompensationsClient({
  period,
  canAdjust,
}: {
  period: Period;
  canAdjust: boolean;
}) {
  const router = useRouter();

  // ── Local state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Adjustment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog form
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [kind, setKind] = useState('ANNUAL_LEAVE_ALLOWANCE');
  const [leaveDays, setLeaveDays] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  // ── Derived ────────────────────────────────────────────────────────────────
  const isLocked = STATUS_LOCKED(period.status);
  const canAdd = canAdjust && !isLocked && period.hasLines;

  const selectedEmployee = period.employees.find((e) => e.id === selectedEmpId);
  const kindCfg = KIND_CFG[kind] ?? KIND_CFG.OTHER;

  const computedAmount = useMemo(() => {
    if (kind === 'ANNUAL_LEAVE_ALLOWANCE' && selectedEmployee && leaveDays) {
      const d = parseFloat(leaveDays);
      if (!isNaN(d) && d > 0) return d * Number(selectedEmployee.dailyRate);
    }
    return null;
  }, [kind, selectedEmployee, leaveDays]);

  const filteredEmployees = useMemo(() =>
    period.employees.filter((e) =>
      e.fullNameEn.toLowerCase().includes(empSearch.toLowerCase()) ||
      e.employmentId.toLowerCase().includes(empSearch.toLowerCase())
    ),
    [period.employees, empSearch],
  );

  const filteredAdjustments = useMemo(() => {
    let rows = period.adjustments;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((a) =>
        a.employee.fullNameEn.toLowerCase().includes(q) ||
        a.employee.employmentId.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q)
      );
    }
    if (kindFilter !== 'ALL') rows = rows.filter((a) => a.kind === kindFilter);
    return rows;
  }, [period.adjustments, search, kindFilter]);

  // ── KPI totals ─────────────────────────────────────────────────────────────
  const totalAdditions = period.adjustments
    .filter((a) => !KIND_CFG[a.kind]?.isDeduction)
    .reduce((s, a) => s + Number(a.amount), 0);
  const totalDeductions = period.adjustments
    .filter((a) => KIND_CFG[a.kind]?.isDeduction)
    .reduce((s, a) => s + Number(a.amount), 0);
  const affectedEmployees = new Set(period.adjustments.map((a) => a.employeeId)).size;

  // ── Per-kind breakdown ─────────────────────────────────────────────────────
  const kindTotals = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const a of period.adjustments) {
      const prev = map.get(a.kind) ?? { count: 0, total: 0 };
      map.set(a.kind, { count: prev.count + 1, total: prev.total + Number(a.amount) });
    }
    return map;
  }, [period.adjustments]);

  // ── Actions ────────────────────────────────────────────────────────────────
  function resetDialog() {
    setSelectedEmpId('');
    setEmpSearch('');
    setKind('ANNUAL_LEAVE_ALLOWANCE');
    setLeaveDays('');
    setAmount('');
    setReason('');
    setError(null);
  }

  async function handleSubmit() {
    if (!selectedEmpId) { setError('Select an employee.'); return; }
    if (!reason.trim()) { setError('Reason is required.'); return; }

    const body: Record<string, unknown> = {
      periodId: period.id,
      employeeId: selectedEmpId,
      kind,
      reason: reason.trim(),
    };

    if (kind === 'ANNUAL_LEAVE_ALLOWANCE') {
      const d = parseFloat(leaveDays);
      if (!d || d <= 0) { setError('Enter a valid number of days.'); return; }
      body.leaveDaysCompensated = d;
    } else {
      const a = parseFloat(amount);
      if (!a || a <= 0) { setError('Enter a valid amount.'); return; }
      body.amount = a;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/payroll-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? 'Failed to save.');
        return;
      }
      setDialogOpen(false);
      resetDialog();
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(adj: Adjustment) {
    setDeleting(adj.id);
    try {
      const res = await fetch(`/api/hr/payroll-adjustments/${adj.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json();
        alert(j.error ?? 'Failed to delete.');
        return;
      }
      setConfirmDelete(null);
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Back link */}
        <Link href={`/hr/payroll/${period.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to {MONTHS[period.month - 1]} {period.year} Payroll
        </Link>

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Compensations & Adjustments</h1>
              </div>
              <p className="text-violet-100 text-sm">
                {MONTHS[period.month - 1]} {period.year} · {period.status}
                {!period.hasLines && ' · Run Calculate first to enable Annual Leave Allowance'}
              </p>
            </div>
            {canAdd && (
              <Button
                onClick={() => { resetDialog(); setDialogOpen(true); }}
                className="bg-white text-violet-700 hover:bg-violet-50 font-semibold shadow"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Compensation
              </Button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="h-4 w-4 text-violet-500" />
              <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total</p>
            </div>
            <p className="text-2xl font-bold text-violet-700">{period.adjustments.length}</p>
            <p className="text-xs text-violet-500 mt-0.5">adjustments</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Additions</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{sar(totalAdditions)}</p>
            <p className="text-xs text-emerald-500 mt-0.5">SAR total</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <MinusCircle className="h-4 w-4 text-rose-500" />
              <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Deductions</p>
            </div>
            <p className="text-2xl font-bold text-rose-700">{sar(totalDeductions)}</p>
            <p className="text-xs text-rose-500 mt-0.5">SAR total</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-sky-500" />
              <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Employees</p>
            </div>
            <p className="text-2xl font-bold text-sky-700">{affectedEmployees}</p>
            <p className="text-xs text-sky-500 mt-0.5">affected</p>
          </div>
        </div>

        {/* Kind breakdown pills */}
        {kindTotals.size > 0 && (
          <div className="flex flex-wrap gap-2">
            {Array.from(kindTotals.entries()).map(([k, { count, total }]) => {
              const cfg = KIND_CFG[k] ?? KIND_CFG.OTHER;
              const Icon = cfg.icon;
              return (
                <button
                  key={k}
                  onClick={() => setKindFilter(kindFilter === k ? 'ALL' : k)}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                    kindFilter === k ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1` : `${cfg.bg} ${cfg.text} ${cfg.border} opacity-80 hover:opacity-100`,
                    kindFilter === k ? `ring-current` : '',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                  <span className="ml-1 opacity-70">×{count} · SAR {sar(total)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Adjustments table */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">All Adjustments</h2>
              <p className="text-xs text-slate-400 mt-0.5">{filteredAdjustments.length} records</p>
            </div>
            <div className="flex items-center gap-2">
              {kindFilter !== 'ALL' && (
                <button onClick={() => setKindFilter('ALL')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear filter
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employee or reason…"
                  className="pl-8 h-8 text-xs w-52"
                />
              </div>
            </div>
          </div>

          {filteredAdjustments.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <SlidersHorizontal className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">No adjustments yet</p>
              <p className="text-xs text-slate-400 mt-1">
                {canAdd ? 'Click "Add Compensation" to record entitlements for this period.' : 'No adjustments have been recorded for this period.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Employee</th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                    <th className="py-2.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Amount</th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Reason</th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Added By</th>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                    {canAdjust && !isLocked && <th className="py-2.5 px-4" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdjustments.map((adj) => {
                    const cfg = KIND_CFG[adj.kind] ?? KIND_CFG.OTHER;
                    const isDeduction = cfg.isDeduction;
                    return (
                      <tr key={adj.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 text-sm">{adj.employee.fullNameEn}</p>
                          <p className="text-xs text-slate-400 font-mono">{adj.employee.employmentId}</p>
                        </td>
                        <td className="py-3 px-4">
                          <KindBadge kind={adj.kind} />
                          {adj.leaveDaysCompensated && (
                            <p className="text-xs text-slate-500 mt-0.5">{adj.leaveDaysCompensated} days</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold">
                          <span className={isDeduction ? 'text-rose-600' : 'text-emerald-700'}>
                            {isDeduction ? '−' : '+'}SAR {sar(adj.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-sm text-slate-600 truncate" title={adj.reason}>{adj.reason}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">{adj.createdBy}</td>
                        <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(adj.createdAt).toLocaleDateString('en-GB')}
                        </td>
                        {canAdjust && !isLocked && (
                          <td className="py-3 px-4">
                            <button
                              onClick={() => setConfirmDelete(adj)}
                              className="text-slate-300 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 bg-slate-50">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                      Net impact ({period.adjustments.length} adjustments)
                    </td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">
                      <span className={totalAdditions - totalDeductions >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                        {totalAdditions - totalDeductions >= 0 ? '+' : '−'}SAR {sar(Math.abs(totalAdditions - totalDeductions))}
                      </span>
                    </td>
                    <td colSpan={canAdjust && !isLocked ? 4 : 3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Annual leave balance table (for employees with leave allowances) */}
        {period.employees.length > 0 && (
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Annual Leave Balance Reference</h2>
                <p className="text-xs text-slate-400 mt-0.5">Available days × daily rate for {period.year}</p>
              </div>
              <Badge variant="secondary">{period.employees.length} employees</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Employee</th>
                    <th className="py-2.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Balance (days)</th>
                    <th className="py-2.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Daily Rate</th>
                    <th className="py-2.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Compensable Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {period.employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-slate-800">{emp.fullNameEn}</p>
                        <p className="text-xs text-slate-400 font-mono">{emp.employmentId}</p>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        <span className={cn(
                          'font-semibold',
                          emp.annualLeaveBalance >= 21 ? 'text-rose-600' :
                          emp.annualLeaveBalance >= 14 ? 'text-amber-600' :
                          'text-slate-700',
                        )}>
                          {emp.annualLeaveBalance.toFixed(1)} days
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">
                        SAR {sar(emp.dailyRate)}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-semibold text-emerald-700">
                        SAR {sar(emp.annualLeaveValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Add Compensation Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) { setDialogOpen(false); resetDialog(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-violet-600" />
              Add Compensation / Adjustment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Employee picker */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Employee</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="Search by name or ID…"
                  className="pl-8 text-sm"
                />
              </div>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                size={Math.min(6, Math.max(3, filteredEmployees.length))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">— select an employee —</option>
                {filteredEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullNameEn} ({e.employmentId})
                  </option>
                ))}
              </select>
              {period.employees.length === 0 && (
                <p className="text-xs text-amber-600">No calculated payroll lines found. Run Calculate on the period first.</p>
              )}
            </div>

            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Entitlements</div>
                  {(['ANNUAL_LEAVE_ALLOWANCE', 'TICKET_ALLOWANCE', 'EXIT_REENTRY_VISA', 'COMMISSION', 'INCENTIVE', 'BONUS', 'OTHER'] as const).map((k) => {
                    const cfg = KIND_CFG[k];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Deductions</div>
                  {(['DEDUCTION', 'FINE', 'ADVANCE_REPAYMENT'] as const).map((k) => {
                    const cfg = KIND_CFG[k];
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-rose-500" />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Annual leave — balance card + days input */}
            {kind === 'ANNUAL_LEAVE_ALLOWANCE' && (
              <div className="space-y-3">
                {selectedEmployee ? (
                  <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Available Balance</p>
                        <p className="text-2xl font-bold text-sky-700 mt-0.5">
                          {selectedEmployee.annualLeaveBalance.toFixed(1)}
                          <span className="text-sm font-normal ml-1">days</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Daily Rate</p>
                        <p className="text-2xl font-bold text-sky-700 mt-0.5">
                          {sar(selectedEmployee.dailyRate)}
                          <span className="text-xs font-normal ml-1">SAR</span>
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-sky-200 pt-3">
                      <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Full balance value</p>
                      <p className="text-lg font-bold text-sky-800">SAR {sar(selectedEmployee.annualLeaveValue)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-500 text-center">
                    Select an employee to see their leave balance
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Days to Compensate</Label>
                  <Input
                    type="number"
                    min="0.5"
                    step="0.5"
                    max={selectedEmployee?.annualLeaveBalance ?? 999}
                    value={leaveDays}
                    onChange={(e) => setLeaveDays(e.target.value)}
                    placeholder="e.g. 5"
                  />
                  {computedAmount !== null && (
                    <p className="text-sm font-semibold text-emerald-700">
                      = SAR {sar(computedAmount)}
                      <span className="text-xs font-normal text-slate-500 ml-1">({leaveDays} days × SAR {sar(selectedEmployee?.dailyRate ?? 0)}/day)</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* All other kinds — manual amount */}
            {kind !== 'ANNUAL_LEAVE_ALLOWANCE' && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Amount (SAR)</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Reason <span className="text-slate-400 font-normal">(required)</span></Label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Annual ticket entitlement for 2026"
                rows={2}
                maxLength={500}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <p className="text-xs text-slate-400 text-right">{reason.length}/500</p>
            </div>

            {/* Warning: period will revert to DRAFT */}
            {(period.status === 'CALCULATED' || period.status === 'APPROVED') && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                Adding this adjustment will revert the period to <strong>DRAFT</strong> — you must recalculate before approving.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetDialog(); }}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="h-4 w-4" />
              Delete Adjustment
            </DialogTitle>
          </DialogHeader>
          {confirmDelete && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-slate-600">
                Delete <strong>{KIND_CFG[confirmDelete.kind]?.label ?? confirmDelete.kind}</strong> of{' '}
                <strong>SAR {sar(confirmDelete.amount)}</strong> for <strong>{confirmDelete.employee.fullNameEn}</strong>?
              </p>
              {confirmDelete.kind === 'ANNUAL_LEAVE_ALLOWANCE' && confirmDelete.leaveDaysCompensated && (
                <div className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-700">
                  <strong>{confirmDelete.leaveDaysCompensated} days</strong> will be restored to this employee's annual leave balance.
                </div>
              )}
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                The period will revert to <strong>DRAFT</strong> if currently Calculated or Approved.
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={deleting === confirmDelete?.id}
            >
              {deleting === confirmDelete?.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
