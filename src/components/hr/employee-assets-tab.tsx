'use client';

/**
 * 18.12.0 — Assets & Violations tab on the employee detail page.
 * Shows all asset assignments (current + historical) and traffic violations
 * for a single employee.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  PackageSearch, Car, Smartphone, Laptop, Tablet, Phone, Key, Wrench, Box, Package,
  Calendar, User, ArrowRight, CheckCircle2, RotateCcw, AlertOctagon, Plus, Loader2,
  Clock, AlertCircle, MinusCircle, Edit2, Trash2, DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type AssetCategory = 'CAR' | 'SIM_CARD' | 'LAPTOP' | 'TABLET' | 'PHONE' | 'KEY' | 'TOOL' | 'EQUIPMENT' | 'OTHER';
type AssetAssignmentStatus = 'ACTIVE' | 'RETURNED';
type ViolationStatus = 'PENDING' | 'PAID_BY_EMPLOYEE' | 'PAID_BY_COMPANY' | 'DEDUCTED_FROM_PAYROLL';

interface AssignmentRow {
  id: string;
  assetId: string;
  assignedDate: string;
  returnedDate: string | null;
  status: AssetAssignmentStatus;
  returnReason: string | null;
  notes: string | null;
  createdAt: string;
  asset: {
    id: string; assetCode: string; name: string; category: AssetCategory; status: string;
    plateNumber: string | null; vehicleMake: string | null; vehicleModel: string | null; vehicleYear: number | null;
    vehicleColor: string | null; simNumber: string | null; mobileNumber: string | null;
    serialNumber: string | null; make: string | null; model: string | null;
  };
  createdBy: { id: string; name: string } | null;
}

interface ViolationRow {
  id: string;
  violationDate: string;
  violationType: string;
  violationAmount: string;
  status: ViolationStatus;
  referenceNumber: string | null;
  issuingAuthority: string | null;
  deductFromPayroll: boolean;
  notes: string | null;
  asset: { id: string; assetCode: string; name: string; plateNumber: string | null } | null;
  createdBy: { id: string; name: string } | null;
}

interface Props {
  employeeId: string;
  canManageAssets: boolean;
  canManageViolations: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function categoryIcon(cat: AssetCategory, cls = 'h-4 w-4') {
  const map: Record<AssetCategory, React.ReactNode> = {
    CAR: <Car className={cls} />, SIM_CARD: <Smartphone className={cls} />,
    LAPTOP: <Laptop className={cls} />, TABLET: <Tablet className={cls} />,
    PHONE: <Phone className={cls} />, KEY: <Key className={cls} />,
    TOOL: <Wrench className={cls} />, EQUIPMENT: <Box className={cls} />, OTHER: <Package className={cls} />,
  };
  return map[cat] ?? <Package className={cls} />;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
}

function money(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

function violationStatusBadge(status: ViolationStatus) {
  const map: Record<ViolationStatus, { label: string; cls: string }> = {
    PENDING:               { label: 'Pending',              cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    PAID_BY_EMPLOYEE:      { label: 'Paid by Employee',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    PAID_BY_COMPANY:       { label: 'Paid by Company',      cls: 'bg-sky-100 text-sky-700 border-sky-200' },
    DEDUCTED_FROM_PAYROLL: { label: 'Deducted',             cls: 'bg-violet-100 text-violet-700 border-violet-200' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', s.cls)}>
      {s.label}
    </span>
  );
}

// ─── Return Dialog ────────────────────────────────────────────────────────────

const RETURN_REASONS = [
  { value: 'VACATION', label: 'Vacation' }, { value: 'RESIGNATION', label: 'Resignation' },
  { value: 'TERMINATION', label: 'Termination' }, { value: 'TRANSFER', label: 'Transfer' },
  { value: 'MAINTENANCE', label: 'Maintenance' }, { value: 'EXPIRED', label: 'Expired' },
  { value: 'PROJECT_END', label: 'Project End' }, { value: 'OTHER', label: 'Other' },
];

function ReturnDialog({ open, assignment, onClose, onSaved }: {
  open: boolean; assignment: AssignmentRow | null; onClose: () => void; onSaved: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleReturn() {
    if (!assignment) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/hr/assets/${assignment.assetId}/return`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnedDate: date, returnReason: reason || undefined, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      onSaved(); onClose();
    } catch { setError('Network error'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Return Asset</DialogTitle>
          <DialogDescription>Mark <strong>{assignment?.asset.name}</strong> as returned.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Return Date *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Return Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReturn} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Violation Edit Dialog ────────────────────────────────────────────────────

function ViolationStatusDialog({ open, violation, onClose, onSaved }: {
  open: boolean; violation: ViolationRow | null; onClose: () => void; onSaved: () => void;
}) {
  const [status, setStatus] = useState<ViolationStatus>(violation?.status ?? 'PENDING');
  const [deduct, setDeduct] = useState(violation?.deductFromPayroll ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (violation) { setStatus(violation.status); setDeduct(violation.deductFromPayroll); }
  }, [violation]);

  async function handleSave() {
    if (!violation) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/hr/traffic-violations/${violation.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, deductFromPayroll: deduct }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      onSaved(); onClose();
    } catch { setError('Network error'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Violation</DialogTitle>
          <DialogDescription>Change status of {violation?.violationType} fine.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as ViolationStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID_BY_EMPLOYEE">Paid by Employee</SelectItem>
                <SelectItem value="PAID_BY_COMPANY">Paid by Company</SelectItem>
                <SelectItem value="DEDUCTED_FROM_PAYROLL">Deducted from Payroll</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="deduct2" checked={deduct} onChange={e => setDeduct(e.target.checked)} className="rounded" />
            <label htmlFor="deduct2" className="text-sm">Flag for payroll deduction</label>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EmployeeAssetsTab({ employeeId, canManageAssets, canManageViolations }: Props) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnAssignment, setReturnAssignment] = useState<AssignmentRow | null>(null);
  const [editViolation, setEditViolation] = useState<ViolationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignRes, violRes] = await Promise.all([
        fetch(`/api/hr/asset-assignments?employeeId=${employeeId}`),
        fetch(`/api/hr/traffic-violations?employeeId=${employeeId}`),
      ]);
      const [assignData, violData] = await Promise.all([assignRes.json(), violRes.json()]);
      setAssignments(Array.isArray(assignData) ? assignData : []);
      setViolations(Array.isArray(violData) ? violData : []);
    } catch {
      setAssignments([]); setViolations([]);
    } finally { setLoading(false); }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const active = assignments.filter(a => a.status === 'ACTIVE');
  const returned = assignments.filter(a => a.status === 'RETURNED');
  const totalFines = violations.reduce((s, v) => s + parseFloat(v.violationAmount || '0'), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-3">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Active Assets</p>
          <p className="text-xl font-bold text-violet-700 mt-1">{active.length}</p>
          <p className="text-xs text-violet-500">currently held</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white border-slate-200 p-3">
          <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Returned</p>
          <p className="text-xl font-bold text-slate-700 mt-1">{returned.length}</p>
          <p className="text-xs text-slate-500">historical</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-3">
          <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Violations</p>
          <p className="text-xl font-bold text-rose-700 mt-1">{violations.length}</p>
          <p className="text-xs text-rose-500">traffic fines</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-3">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total Fines</p>
          <p className="text-xl font-bold text-amber-700 mt-1">SAR {money(totalFines)}</p>
          <p className="text-xs text-amber-500">all violations</p>
        </div>
      </div>

      {/* ── Asset Assignments ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
          <PackageSearch className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-700">Asset Assignments</h3>
          <span className="text-xs text-slate-400 ml-auto">Timeline of all assigned assets</span>
        </div>

        {assignments.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">
            No asset assignments found for this employee.
          </div>
        ) : (
          <div className="divide-y">
            {/* Active first */}
            {active.map(a => (
              <div key={a.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Timeline dot */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1 flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-violet-500 border-2 border-violet-300 shadow-sm" />
                    <div className="w-0.5 h-6 bg-violet-200 mt-1" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-1 bg-violet-100 rounded text-violet-600">
                        {categoryIcon(a.asset.category, 'h-3.5 w-3.5')}
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{a.asset.name}</span>
                      <span className="text-xs font-mono text-slate-400">{a.asset.assetCode}</span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Current</span>
                    </div>
                    {a.asset.category === 'CAR' && a.asset.plateNumber && (
                      <span className="text-xs font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                        {a.asset.plateNumber}
                      </span>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />From {fmtDate(a.assignedDate)}</span>
                      <span className="text-emerald-600 font-medium">→ Present</span>
                    </div>
                    {a.notes && <p className="text-xs text-slate-400 italic">{a.notes}</p>}
                  </div>
                </div>
                {canManageAssets && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 self-start"
                    onClick={() => setReturnAssignment(a)}>
                    <RotateCcw className="h-3 w-3 mr-1" />Return
                  </Button>
                )}
              </div>
            ))}

            {/* Returned */}
            {returned.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-start gap-3 opacity-70">
                <div className="flex flex-col items-center mt-1">
                  <div className="h-3 w-3 rounded-full border-2 border-slate-300 bg-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="p-1 bg-slate-100 rounded text-slate-500">
                      {categoryIcon(a.asset.category, 'h-3.5 w-3.5')}
                    </div>
                    <span className="text-sm font-medium text-slate-600">{a.asset.name}</span>
                    <span className="text-xs font-mono text-slate-400">{a.asset.assetCode}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full">Returned</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(a.assignedDate)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{fmtDate(a.returnedDate)}</span>
                    {a.returnReason && <span className="capitalize">({a.returnReason.toLowerCase().replace(/_/g, ' ')})</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Traffic Violations ────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-rose-500" />
          <h3 className="text-sm font-semibold text-slate-700">Traffic Violations</h3>
          <span className="text-xs text-slate-400 ml-auto">{violations.length} record{violations.length !== 1 ? 's' : ''}</span>
        </div>

        {violations.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">
            No traffic violations recorded for this employee.
          </div>
        ) : (
          <div className="divide-y">
            {violations.map(v => (
              <div key={v.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-800">{v.violationType}</span>
                    {violationStatusBadge(v.status)}
                    {v.deductFromPayroll && (
                      <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full">Deduct</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(v.violationDate)}</span>
                    {v.asset && (
                      <span className="flex items-center gap-1 text-sky-600"><Car className="h-3 w-3" />{v.asset.plateNumber ?? v.asset.assetCode}</span>
                    )}
                    {v.referenceNumber && <span>Ref: {v.referenceNumber}</span>}
                    {v.issuingAuthority && <span>{v.issuingAuthority}</span>}
                  </div>
                  {v.notes && <p className="text-xs text-slate-400 italic">{v.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-rose-700">SAR {money(v.violationAmount)}</p>
                  {canManageViolations && (
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditViolation(v)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ReturnDialog
        open={!!returnAssignment}
        assignment={returnAssignment}
        onClose={() => setReturnAssignment(null)}
        onSaved={load}
      />
      <ViolationStatusDialog
        open={!!editViolation}
        violation={editViolation}
        onClose={() => setEditViolation(null)}
        onSaved={load}
      />
    </div>
  );
}
