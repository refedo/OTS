'use client';

/**
 * 18.12.0 — Traffic Violations & Infractions
 * Record and track traffic fines per employee, optionally linked to a company car.
 * Supports payroll deduction flagging.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertOctagon,
  Plus,
  Search,
  Car,
  User,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MinusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const ISSUING_AUTHORITIES = [
  'Traffic Department',
  'Najm',
  'Riyadh Municipality',
  'Jeddah Municipality',
  'ZATCA (Zakat, Tax & Customs)',
  'Ministry of Interior',
  'Other',
];

const VIOLATION_TYPES = [
  'Speeding',
  'Red Light Violation',
  'Mobile Phone Usage While Driving',
  'Safety Belt Violation',
  'Wrong Parking',
  'No Registration / Expired Registration',
  'Expired Insurance',
  'Reckless Driving',
  'Wrong Way / U-Turn Violation',
  'Running Stop Sign',
  'Overloading',
  'Tinted Windows',
  'Other',
];

// ─── Types ───────────────────────────────────────────────────────────────────

type ViolationStatus = 'PENDING' | 'PAID_BY_EMPLOYEE' | 'PAID_BY_COMPANY' | 'DEDUCTED_FROM_PAYROLL';

interface ViolationRow {
  id: string;
  employeeId: string;
  assetId: string | null;
  violationDate: string;
  violationType: string;
  violationAmount: string;
  status: ViolationStatus;
  referenceNumber: string | null;
  issuingAuthority: string | null;
  deductFromPayroll: boolean;
  notes: string | null;
  createdAt: string;
  employee: { id: string; fullNameEn: string; employmentId: string };
  asset: { id: string; assetCode: string; name: string; plateNumber: string | null } | null;
  createdBy: { id: string; name: string } | null;
}

interface EmployeeOption { id: string; fullNameEn: string; employmentId: string; }
interface CarOption { id: string; assetCode: string; name: string; plateNumber: string | null; }

interface Props { canManage: boolean; viewOwnEmployeeId?: string | null; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: ViolationStatus) {
  const map: Record<ViolationStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING:               { label: 'Pending',              cls: 'bg-amber-100 text-amber-700 border-amber-200',   icon: <Clock className="h-3 w-3" /> },
    PAID_BY_EMPLOYEE:      { label: 'Paid by Employee',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
    PAID_BY_COMPANY:       { label: 'Paid by Company',      cls: 'bg-sky-100 text-sky-700 border-sky-200',         icon: <AlertCircle className="h-3 w-3" /> },
    DEDUCTED_FROM_PAYROLL: { label: 'Deducted from Payroll',cls: 'bg-violet-100 text-violet-700 border-violet-200', icon: <MinusCircle className="h-3 w-3" /> },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: null };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', s.cls)}>
      {s.icon}{s.label}
    </span>
  );
}

function money(v: string | number) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

function ViolationFormDialog({
  open, onClose, onSaved, initial,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; initial: Partial<ViolationRow> | null;
}) {
  const isEdit = !!initial?.id;
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [empSearch, setEmpSearch] = useState(initial?.employee?.fullNameEn ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [autoLoadingCar, setAutoLoadingCar] = useState(false);

  const resolveAuthority = (val: string | null | undefined): string => {
    if (!val) return '';
    return ISSUING_AUTHORITIES.includes(val) ? val : 'Other';
  };
  const resolveViolationType = (val: string | null | undefined): string => {
    if (!val) return '';
    return VIOLATION_TYPES.includes(val) ? val : 'Other';
  };

  const [form, setForm] = useState({
    employeeId: initial?.employeeId ?? '',
    assetId: initial?.assetId ?? '',
    violationDate: initial?.violationDate ? initial.violationDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    violationTypeSelect: resolveViolationType(initial?.violationType),
    violationTypeCustom: initial?.violationType && !VIOLATION_TYPES.includes(initial.violationType) ? initial.violationType : '',
    violationAmount: initial?.violationAmount ?? '',
    status: (initial?.status ?? 'PENDING') as ViolationStatus,
    referenceNumber: initial?.referenceNumber ?? '',
    issuingAuthoritySelect: resolveAuthority(initial?.issuingAuthority),
    issuingAuthorityCustom: initial?.issuingAuthority && !ISSUING_AUTHORITIES.includes(initial.issuingAuthority) ? initial.issuingAuthority : '',
    deductFromPayroll: initial?.deductFromPayroll ?? false,
    notes: initial?.notes ?? '',
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    fetch('/api/hr/employees?status=ACTIVE&limit=500').then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : (d.employees ?? []))).catch(() => {});
    fetch('/api/hr/assets?category=CAR&status=ASSIGNED').then(r => r.json()).then(d => setCars(Array.isArray(d) ? d : [])).catch(() => {});
  }, [open]);

  const filteredEmps = employees.filter(e =>
    empSearch === '' || e.fullNameEn.toLowerCase().includes(empSearch.toLowerCase()) || e.employmentId.includes(empSearch)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const violationType = form.violationTypeSelect === 'Other' ? form.violationTypeCustom : form.violationTypeSelect;
      const issuingAuthority = form.issuingAuthoritySelect === 'Other' ? form.issuingAuthorityCustom : form.issuingAuthoritySelect;
      const payload = {
        employeeId: form.employeeId,
        assetId: form.assetId || undefined,
        violationDate: form.violationDate,
        violationType,
        violationAmount: parseFloat(form.violationAmount),
        status: form.status,
        referenceNumber: form.referenceNumber || undefined,
        issuingAuthority: issuingAuthority || undefined,
        deductFromPayroll: form.deductFromPayroll,
        notes: form.notes || undefined,
      };
      const url = isEdit ? `/api/hr/traffic-violations/${initial!.id}` : '/api/hr/traffic-violations';
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
      onSaved(); onClose();
    } catch { setError('Network error'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Violation' : 'Record Traffic Violation'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update violation details.' : 'Record a new traffic violation or infraction.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee picker */}
          <div className="space-y-1">
            <Label>Employee *</Label>
            <Input
              placeholder="Search employee..."
              value={empSearch}
              onChange={e => {
                setEmpSearch(e.target.value);
                if (form.employeeId) {
                  set('employeeId', '');
                  set('assetId', '');
                }
              }}
            />
            {empSearch && !form.employeeId && (
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                {filteredEmps.slice(0, 15).map(emp => (
                  <button key={emp.id} type="button"
                    onClick={async () => {
                      set('employeeId', emp.id);
                      setEmpSearch(emp.fullNameEn);
                      setAutoLoadingCar(true);
                      try {
                        const res = await fetch(`/api/hr/asset-assignments?employeeId=${emp.id}&status=ACTIVE&category=CAR`);
                        const data: Array<{ asset: { id: string; assetCode: string; name: string; plateNumber: string | null; category: string } }> = await res.json();
                        const carAssignment = Array.isArray(data) ? data.find(a => a.asset?.category === 'CAR') : undefined;
                        if (carAssignment) set('assetId', carAssignment.asset.id);
                      } catch { /* silently skip — manual selection still available */ } finally {
                        setAutoLoadingCar(false);
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between"
                  >
                    <span>{emp.fullNameEn}</span>
                    <span className="text-xs text-slate-400">{emp.employmentId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Linked Car */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label>Linked Vehicle (optional)</Label>
              {autoLoadingCar && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            </div>
            <Select value={form.assetId || '__none__'} onValueChange={v => set('assetId', v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select company vehicle..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {cars.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.plateNumber ? ` · ${c.plateNumber}` : ''} ({c.assetCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Violation Date *</Label>
              <Input type="date" value={form.violationDate} onChange={e => set('violationDate', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Amount (SAR) *</Label>
              <Input type="number" step="0.01" value={form.violationAmount} onChange={e => set('violationAmount', e.target.value)} required />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Violation Type *</Label>
              <Select value={form.violationTypeSelect} onValueChange={v => set('violationTypeSelect', v)}>
                <SelectTrigger><SelectValue placeholder="Select violation type..." /></SelectTrigger>
                <SelectContent>
                  {VIOLATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.violationTypeSelect === 'Other' && (
                <Input className="mt-2" value={form.violationTypeCustom} onChange={e => set('violationTypeCustom', e.target.value)} placeholder="Describe the violation..." required />
              )}
            </div>
            <div className="space-y-1">
              <Label>Reference / Fine Number</Label>
              <Input value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Issuing Authority</Label>
              <Select value={form.issuingAuthoritySelect || '__none__'} onValueChange={v => set('issuingAuthoritySelect', v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select authority..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {ISSUING_AUTHORITIES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.issuingAuthoritySelect === 'Other' && (
                <Input className="mt-2" value={form.issuingAuthorityCustom} onChange={e => set('issuingAuthorityCustom', e.target.value)} placeholder="Enter authority name..." />
              )}
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID_BY_EMPLOYEE">Paid by Employee</SelectItem>
                  <SelectItem value="PAID_BY_COMPANY">Paid by Company</SelectItem>
                  <SelectItem value="DEDUCTED_FROM_PAYROLL">Deducted from Payroll</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="deduct" checked={form.deductFromPayroll}
              onChange={e => set('deductFromPayroll', e.target.checked)}
              className="rounded border-slate-300" />
            <label htmlFor="deduct" className="text-sm text-slate-700">Flag for payroll deduction</label>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.employeeId || !form.violationTypeSelect || (form.violationTypeSelect === 'Other' && !form.violationTypeCustom)}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Record Violation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({ open, violation, onClose, onDeleted }: {
  open: boolean; violation: ViolationRow | null; onClose: () => void; onDeleted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function handleDelete() {
    if (!violation) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/hr/traffic-violations/${violation.id}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleteReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      onDeleted(); onClose();
    } catch { setError('Network error'); } finally { setSaving(false); }
  }
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Violation</DialogTitle>
          <DialogDescription>Provide a reason for deleting this record.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Reason..." />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving || !reason.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TrafficViolationsClient({ canManage, viewOwnEmployeeId }: Props) {
  const viewOwnOnly = !!viewOwnEmployeeId;
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<ViolationRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ViolationRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (viewOwnEmployeeId) params.set('employeeId', viewOwnEmployeeId);
      const res = await fetch(`/api/hr/traffic-violations?${params}`);
      const data = await res.json();
      setViolations(Array.isArray(data) ? data : []);
    } catch { setViolations([]); } finally { setLoading(false); }
  }, [filterStatus, viewOwnEmployeeId]);

  useEffect(() => { load(); }, [load]);

  const filtered = violations.filter(v =>
    search === '' ||
    v.employee.fullNameEn.toLowerCase().includes(search.toLowerCase()) ||
    v.violationType.toLowerCase().includes(search.toLowerCase()) ||
    v.employee.employmentId.includes(search)
  );

  const totalAmount = violations.reduce((s, v) => s + parseFloat(v.violationAmount || '0'), 0);
  const pending = violations.filter(v => v.status === 'PENDING').length;
  const paidByCompany = violations.filter(v => v.status === 'PAID_BY_COMPANY').length;
  const deductible = violations.filter(v => v.deductFromPayroll).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-rose-600 via-rose-500 to-red-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <AlertOctagon className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Traffic Violations</h1>
              </div>
              <p className="text-rose-100 text-sm">
                {viewOwnOnly
                  ? 'Your traffic violations and infractions associated with company vehicles.'
                  : 'Record and track traffic fines and infractions per employee. Flag company-paid violations for payroll deduction.'}
              </p>
            </div>
            {canManage && !viewOwnOnly && (
              <Button onClick={() => setCreateOpen(true)} className="bg-white text-rose-700 hover:bg-rose-50 border-0 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />Record Violation
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Total Violations</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{violations.length}</p>
            <p className="text-xs text-rose-500 mt-0.5">all records</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{pending}</p>
            <p className="text-xs text-amber-500 mt-0.5">awaiting resolution</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Paid by Company</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{paidByCompany}</p>
            <p className="text-xs text-sky-500 mt-0.5">company liability</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Amount</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">SAR {money(totalAmount)}</p>
            <p className="text-xs text-violet-500 mt-0.5">{deductible} flagged for deduction</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search by employee or violation type..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus || '__all__'} onValueChange={v => setFilterStatus(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PAID_BY_EMPLOYEE">Paid by Employee</SelectItem>
              <SelectItem value="PAID_BY_COMPANY">Paid by Company</SelectItem>
              <SelectItem value="DEDUCTED_FROM_PAYROLL">Deducted from Payroll</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Violations List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white shadow-sm p-12 text-center">
            <AlertOctagon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No violations found</p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">Violations ({filtered.length})</h2>
            </div>
            <div className="divide-y">
              {filtered.map(v => (
                <div key={v.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {v.employee.fullNameEn}
                        <span className="text-xs text-slate-400 font-normal">({v.employee.employmentId})</span>
                      </div>
                      {statusBadge(v.status)}
                      {v.deductFromPayroll && (
                        <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full">Deduct</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(v.violationDate)}</span>
                      <span className="font-medium text-slate-700">{v.violationType}</span>
                      {v.asset && (
                        <span className="flex items-center gap-1 text-sky-600">
                          <Car className="h-3 w-3" />
                          {v.asset.plateNumber ?? v.asset.assetCode}
                        </span>
                      )}
                      {v.referenceNumber && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{v.referenceNumber}</span>}
                      {v.issuingAuthority && <span>{v.issuingAuthority}</span>}
                    </div>
                    {v.notes && <p className="text-xs text-slate-400 italic">{v.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-700">SAR {money(v.violationAmount)}</p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditRow(v)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setDeleteRow(v)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ViolationFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={load} initial={null} />
      {editRow && <ViolationFormDialog open={!!editRow} onClose={() => setEditRow(null)} onSaved={load} initial={editRow} />}
      <DeleteDialog open={!!deleteRow} violation={deleteRow} onClose={() => setDeleteRow(null)} onDeleted={load} />
    </div>
  );
}
