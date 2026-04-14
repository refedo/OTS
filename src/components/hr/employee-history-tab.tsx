'use client';

/**
 * 18.9.1 — Beautified dual timeline for position + salary history.
 * Rendered inside the "History" tab on /hr/employees/[id].
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Check,
  X,
  Send,
  Briefcase,
  TrendingUp,
  ArrowRight,
  Calendar,
  Building2,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileEdit,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

type PositionReason =
  | 'HIRED'
  | 'PROMOTED'
  | 'TRANSFERRED'
  | 'DEMOTED'
  | 'ROLE_CHANGE'
  | 'RESIGNED'
  | 'TERMINATED'
  | 'REHIRED';

type SalaryReason =
  | 'HIRED'
  | 'ANNUAL_INCREMENT'
  | 'PROMOTION'
  | 'ADJUSTMENT'
  | 'COLA'
  | 'CORRECTION'
  | 'DEMOTION';

type SalaryStatus = 'DRAFT' | 'PENDING_HR' | 'PENDING_CEO' | 'APPROVED' | 'REJECTED';

interface PositionRow {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  positionTitle: string;
  section: string | null;
  division: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  reason: PositionReason;
  notes: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

interface SalaryRow {
  id: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  basicSalary: string;
  housingAllowance: string;
  transportAllowance: string;
  mobileAllowance: string;
  foodAllowance: string;
  otherAllowances: string;
  reason: SalaryReason;
  notes: string | null;
  status: SalaryStatus;
  positionHistory: { id: string; positionTitle: string } | null;
  submittedBy: { id: string; name: string } | null;
  hrApprovedBy: { id: string; name: string } | null;
  ceoApprovedBy: { id: string; name: string } | null;
  rejectedBy: { id: string; name: string } | null;
  rejectReason: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

interface Props {
  employeeId: string;
  departments: { id: string; name: string }[];
  canManagePosition: boolean;
  canManageSalary: boolean;
  canApproveHr: boolean;
  canApproveCeo: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const POSITION_REASONS: PositionReason[] = [
  'HIRED',
  'PROMOTED',
  'TRANSFERRED',
  'DEMOTED',
  'ROLE_CHANGE',
  'RESIGNED',
  'TERMINATED',
  'REHIRED',
];

const SALARY_REASONS: SalaryReason[] = [
  'HIRED',
  'ANNUAL_INCREMENT',
  'PROMOTION',
  'ADJUSTMENT',
  'COLA',
  'CORRECTION',
  'DEMOTION',
];

const POSITION_REASON_LABELS: Record<PositionReason, string> = {
  HIRED: 'Hired',
  PROMOTED: 'Promoted',
  TRANSFERRED: 'Transferred',
  DEMOTED: 'Demoted',
  ROLE_CHANGE: 'Role Change',
  RESIGNED: 'Resigned',
  TERMINATED: 'Terminated',
  REHIRED: 'Re-hired',
};

const SALARY_REASON_LABELS: Record<SalaryReason, string> = {
  HIRED: 'Hired',
  ANNUAL_INCREMENT: 'Annual Increment',
  PROMOTION: 'Promotion',
  ADJUSTMENT: 'Adjustment',
  COLA: 'Cost of Living',
  CORRECTION: 'Correction',
  DEMOTION: 'Demotion',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(s: string | null): string {
  if (!s) return 'Present';
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function money(v: string | number): string {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusConfig(status: SalaryStatus): {
  label: string;
  icon: React.ReactNode;
  classes: string;
} {
  switch (status) {
    case 'APPROVED':
      return {
        label: 'Approved',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        icon: <XCircle className="h-3.5 w-3.5" />,
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    case 'PENDING_HR':
      return {
        label: 'Pending HR',
        icon: <Clock className="h-3.5 w-3.5" />,
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    case 'PENDING_CEO':
      return {
        label: 'Pending CEO',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        classes: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    default:
      return {
        label: 'Draft',
        icon: <FileEdit className="h-3.5 w-3.5" />,
        classes: 'bg-slate-50 text-slate-600 border-slate-200',
      };
  }
}

function positionReasonColor(reason: PositionReason): string {
  switch (reason) {
    case 'PROMOTED':
    case 'REHIRED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'TRANSFERRED':
    case 'ROLE_CHANGE':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'DEMOTED':
    case 'TERMINATED':
    case 'RESIGNED':
      return 'bg-rose-100 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmployeeHistoryTab({
  employeeId,
  departments,
  canManagePosition,
  canManageSalary,
  canApproveHr,
  canApproveCeo,
}: Props) {
  const [positionRows, setPositionRows] = useState<PositionRow[]>([]);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [posRes, salRes] = await Promise.all([
        fetch(`/api/hr/employees/${employeeId}/position-history`),
        fetch(`/api/hr/employees/${employeeId}/salary-history`),
      ]);
      if (!posRes.ok) throw new Error(`Position history: ${posRes.status}`);
      if (!salRes.ok) throw new Error(`Salary history: ${salRes.status}`);
      setPositionRows(await posRes.json());
      setSalaryRows(await salRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Failed to load history: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Position Timeline ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100">
              <Briefcase className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Position History</h3>
              <p className="text-xs text-slate-400">{positionRows.length} record{positionRows.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {canManagePosition && (
            <AddPositionDialog
              employeeId={employeeId}
              departments={departments}
              onSaved={() => void load()}
            />
          )}
        </div>

        {positionRows.length === 0 ? (
          <EmptyState icon={<Briefcase className="h-8 w-8" />} message="No position history recorded yet." />
        ) : (
          <div className="relative">
            {/* Vertical connector */}
            {positionRows.length > 1 && (
              <div className="absolute left-[19px] top-6 bottom-6 w-px bg-slate-200" />
            )}
            <div className="space-y-3">
              {positionRows.map((r, idx) => {
                const isCurrent = r.effectiveTo === null;
                return (
                  <div key={r.id} className="flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0 mt-1">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-full border-2 flex items-center justify-center z-10 relative',
                          isCurrent
                            ? 'bg-sky-500 border-sky-600 text-white shadow-md shadow-sky-200'
                            : 'bg-white border-slate-300 text-slate-400',
                        )}
                      >
                        <Briefcase className="h-4 w-4" />
                      </div>
                      {idx < positionRows.length - 1 && (
                        <div className="absolute top-9 left-1/2 -translate-x-1/2 w-px h-3 bg-slate-200" />
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={cn(
                        'flex-1 rounded-xl border p-4 transition-colors',
                        isCurrent
                          ? 'bg-sky-50/60 border-sky-200'
                          : 'bg-white border-slate-200',
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-sm">{r.positionTitle}</span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                                positionReasonColor(r.reason),
                              )}
                            >
                              {POSITION_REASON_LABELS[r.reason]}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" /> Current
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(r.effectiveFrom)}
                              <ArrowRight className="h-3 w-3" />
                              {formatDate(r.effectiveTo)}
                            </span>
                            {r.department && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {r.department.name}
                              </span>
                            )}
                            {r.section && <span>{r.section}</span>}
                            {r.division && <span>· {r.division}</span>}
                          </div>
                          {r.notes && (
                            <p className="text-xs text-slate-500 italic mt-1">{r.notes}</p>
                          )}
                        </div>
                        {r.createdBy && (
                          <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                            <User className="h-3 w-3" />
                            {r.createdBy.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Salary Timeline ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Salary History</h3>
              <p className="text-xs text-slate-400">{salaryRows.length} record{salaryRows.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {canManageSalary && (
            <AddSalaryDialog
              employeeId={employeeId}
              positionRows={positionRows}
              onSaved={() => void load()}
            />
          )}
        </div>

        {salaryRows.length === 0 ? (
          <EmptyState icon={<TrendingUp className="h-8 w-8" />} message="No salary history recorded yet." />
        ) : (
          <div className="space-y-3">
            {salaryRows.map((r) => (
              <SalaryRowCard
                key={r.id}
                row={r}
                employeeId={employeeId}
                canManage={canManageSalary}
                canApproveHr={canApproveHr}
                canApproveCeo={canApproveCeo}
                onAction={() => void load()}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Salary row card ──────────────────────────────────────────────────────────

function SalaryRowCard({
  row,
  employeeId,
  canManage,
  canApproveHr,
  canApproveCeo,
  onAction,
}: {
  row: SalaryRow;
  employeeId: string;
  canManage: boolean;
  canApproveHr: boolean;
  canApproveCeo: boolean;
  onAction: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'submit' | 'approveHr' | 'approveCeo' | 'reject') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(
        `/api/hr/employees/${employeeId}/salary-history/${row.id}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onAction();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const isCurrent = row.effectiveTo === null && row.status === 'APPROVED';
  const sc = statusConfig(row.status);

  const basic = parseFloat(row.basicSalary || '0');
  const housing = parseFloat(row.housingAllowance || '0');
  const transport = parseFloat(row.transportAllowance || '0');
  const mobile = parseFloat(row.mobileAllowance || '0');
  const food = parseFloat(row.foodAllowance || '0');
  const other = parseFloat(row.otherAllowances || '0');
  const total = basic + housing + transport + mobile + food + other;

  return (
    <div
      className={cn(
        'rounded-xl border transition-colors',
        isCurrent ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200',
      )}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
              sc.classes,
            )}
          >
            {sc.icon}
            {sc.label}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {SALARY_REASON_LABELS[row.reason]}
          </span>
          {isCurrent && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> Active
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Calendar className="h-3 w-3" />
          {formatDate(row.effectiveFrom)}
          <ArrowRight className="h-3 w-3" />
          {formatDate(row.effectiveTo)}
        </span>
      </div>

      {/* Comp breakdown */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5">
          {[
            { label: 'Basic', value: basic },
            { label: 'Housing', value: housing },
            { label: 'Transport', value: transport },
            { label: 'Mobile', value: mobile },
            { label: 'Food', value: food },
            { label: 'Other', value: other },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{label}</span>
              <span className="font-medium text-slate-700 tabular-nums">
                SAR {money(value)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Package</span>
          <span className={cn(
            'text-base font-bold tabular-nums',
            isCurrent ? 'text-emerald-700' : 'text-slate-800',
          )}>
            SAR {money(total)}
          </span>
        </div>
      </div>

      {/* Linked position */}
      {row.positionHistory && (
        <div className="mx-4 mb-3 flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100">
          <Briefcase className="h-3 w-3 text-slate-400" />
          Linked to: <span className="font-medium">{row.positionHistory.positionTitle}</span>
        </div>
      )}

      {/* Notes + reject reason */}
      {row.notes && (
        <p className="mx-4 mb-2 text-xs text-slate-500 italic">{row.notes}</p>
      )}
      {row.rejectReason && (
        <div className="mx-4 mb-3 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-1.5 border border-rose-100">
          <XCircle className="h-3 w-3" /> Rejected: {row.rejectReason}
        </div>
      )}

      {/* Approval trail + actions */}
      <div className="px-4 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          {row.submittedBy && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> Submitted by {row.submittedBy.name}
            </span>
          )}
          {row.hrApprovedBy && (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" /> HR: {row.hrApprovedBy.name}
            </span>
          )}
          {row.ceoApprovedBy && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> CEO: {row.ceoApprovedBy.name}
            </span>
          )}
          {row.rejectedBy && (
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-rose-500" /> Rejected by {row.rejectedBy.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {row.status === 'DRAFT' && canManage && (
            <Button size="sm" variant="outline" onClick={() => act('submit')} disabled={busy !== null}
              className="text-xs h-8">
              {busy === 'submit' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
              Submit to HR
            </Button>
          )}
          {row.status === 'PENDING_HR' && canApproveHr && (
            <>
              <Button size="sm" onClick={() => act('approveHr')} disabled={busy !== null}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700">
                {busy === 'approveHr' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                HR Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => act('reject')} disabled={busy !== null}
                className="text-xs h-8">
                <X className="mr-1 h-3 w-3" /> Reject
              </Button>
            </>
          )}
          {row.status === 'PENDING_CEO' && canApproveCeo && (
            <>
              <Button size="sm" onClick={() => act('approveCeo')} disabled={busy !== null}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700">
                {busy === 'approveCeo' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                CEO Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => act('reject')} disabled={busy !== null}
                className="text-xs h-8">
                <X className="mr-1 h-3 w-3" /> Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-1.5 border border-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Add Position Dialog ──────────────────────────────────────────────────────

function AddPositionDialog({
  employeeId,
  departments,
  onSaved,
}: {
  employeeId: string;
  departments: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [positionTitle, setPositionTitle] = useState('');
  const [reason, setReason] = useState<PositionReason>('PROMOTED');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}/position-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectiveFrom,
          positionTitle,
          reason,
          departmentId: departmentId || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      setPositionTitle('');
      setNotes('');
      setDepartmentId('');
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
          <Plus className="h-3.5 w-3.5" /> Record change
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New position change</DialogTitle>
          <DialogDescription>
            Records a promotion, transfer, or role change. The previous open row is closed automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Position title</Label>
            <Input
              value={positionTitle}
              onChange={(e) => setPositionTitle(e.target.value)}
              placeholder="Fabricator, Foreman, …"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as PositionReason)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {POSITION_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Department</Label>
            <Select value={departmentId || 'none'} onValueChange={(v) => setDepartmentId(v === 'none' ? '' : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </div>
          {error && (
            <div className="col-span-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !positionTitle || !effectiveFrom}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Salary Dialog ────────────────────────────────────────────────────────

function AddSalaryDialog({
  employeeId,
  positionRows,
  onSaved,
}: {
  employeeId: string;
  positionRows: PositionRow[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [basicSalary, setBasicSalary] = useState('');
  const [housing, setHousing] = useState('');
  const [transport, setTransport] = useState('');
  const [mobile, setMobile] = useState('');
  const [food, setFood] = useState('');
  const [other, setOther] = useState('');
  const [reason, setReason] = useState<SalaryReason>('ANNUAL_INCREMENT');
  const [positionHistoryId, setPositionHistoryId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitNow, setSubmitNow] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previewTotal =
    (parseFloat(basicSalary) || 0) +
    (parseFloat(housing) || 0) +
    (parseFloat(transport) || 0) +
    (parseFloat(mobile) || 0) +
    (parseFloat(food) || 0) +
    (parseFloat(other) || 0);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hr/employees/${employeeId}/salary-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectiveFrom,
          basicSalary,
          housingAllowance: housing || '0',
          transportAllowance: transport || '0',
          mobileAllowance: mobile || '0',
          foodAllowance: food || '0',
          otherAllowances: other || '0',
          reason,
          positionHistoryId: positionHistoryId || null,
          notes: notes || null,
          submit: submitNow,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setOpen(false);
      setBasicSalary('');
      setHousing('');
      setTransport('');
      setMobile('');
      setFood('');
      setOther('');
      setNotes('');
      setPositionHistoryId('');
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
          <Plus className="h-3.5 w-3.5" /> Record raise
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New salary change</DialogTitle>
          <DialogDescription>
            Drafts a raise, increment, or adjustment. Final approval requires CEO sign-off.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-slate-600">Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as SalaryReason)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALARY_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {SALARY_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Basic salary (SAR)</Label>
            <Input value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Housing (SAR)</Label>
            <Input value={housing} onChange={(e) => setHousing(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Transport (SAR)</Label>
            <Input value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Mobile (SAR)</Label>
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600">Food (SAR)</Label>
            <Input value={food} onChange={(e) => setFood(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Other (SAR)</Label>
            <Input value={other} onChange={(e) => setOther(e.target.value)} placeholder="0.00" className="mt-1" />
          </div>

          {/* Live total preview */}
          {previewTotal > 0 && (
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-2.5">
              <span className="text-xs font-medium text-emerald-700">Total package</span>
              <span className="text-sm font-bold text-emerald-800 tabular-nums">
                SAR {money(previewTotal)}
              </span>
            </div>
          )}

          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Link to a position change (optional)</Label>
            <Select
              value={positionHistoryId || 'none'}
              onValueChange={(v) => setPositionHistoryId(v === 'none' ? '' : v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {positionRows.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.positionTitle} ({formatDate(p.effectiveFrom)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label className="text-xs font-medium text-slate-600">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          </div>

          <div className="col-span-2 flex items-center gap-2.5 rounded-lg bg-sky-50 border border-sky-100 px-4 py-3">
            <input
              id="submit-now"
              type="checkbox"
              checked={submitNow}
              onChange={(e) => setSubmitNow(e.target.checked)}
              className="h-4 w-4 rounded border-sky-300 text-sky-600"
            />
            <label htmlFor="submit-now" className="text-sm text-sky-700 cursor-pointer">
              Submit for HR approval immediately
            </label>
          </div>

          {error && (
            <div className="col-span-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2 border border-rose-100">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !basicSalary || !effectiveFrom}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save {submitNow ? '& submit' : 'as draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
