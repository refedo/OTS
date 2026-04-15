'use client';

/**
 * 18.12.0 — Company Asset Registry
 * Manage all company assets (cars, SIM cards, laptops, keys, tools, etc.),
 * assign them to employees, and track assignment history.
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
  PackageSearch,
  Plus,
  Car,
  Smartphone,
  Laptop,
  Tablet,
  Phone,
  Key,
  Wrench,
  Box,
  Package,
  Search,
  User,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  RotateCcw,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type AssetCategory = 'CAR' | 'SIM_CARD' | 'LAPTOP' | 'TABLET' | 'PHONE' | 'KEY' | 'TOOL' | 'EQUIPMENT' | 'OTHER';
type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'DAMAGED' | 'LOST';

interface ActiveAssignment {
  id: string;
  assignedDate: string;
  employee: { id: string; fullNameEn: string; employmentId: string };
}

interface AssetRow {
  id: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  plateNumber: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleColor: string | null;
  vin: string | null;
  currentOdometer: number | null;
  simNumber: string | null;
  mobileNumber: string | null;
  carrier: string | null;
  serialNumber: string | null;
  make: string | null;
  model: string | null;
  purchaseDate: string | null;
  purchasePrice: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
  assignments: ActiveAssignment[];
}

interface EmployeeOption {
  id: string;
  fullNameEn: string;
  employmentId: string;
  occupation: string | null;
}

interface Props {
  canManage: boolean;
  canViewViolations: boolean;
  canManageViolations: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'CAR', label: 'Car' },
  { value: 'SIM_CARD', label: 'SIM Card' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'KEY', label: 'Key' },
  { value: 'TOOL', label: 'Tool' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'OTHER', label: 'Other' },
];

const RETURN_REASONS = [
  { value: 'VACATION', label: 'Vacation' },
  { value: 'RESIGNATION', label: 'Resignation' },
  { value: 'TERMINATION', label: 'Termination' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'PROJECT_END', label: 'Project End' },
  { value: 'OTHER', label: 'Other' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function categoryIcon(cat: AssetCategory, cls = 'h-4 w-4') {
  const map: Record<AssetCategory, React.ReactNode> = {
    CAR: <Car className={cls} />,
    SIM_CARD: <Smartphone className={cls} />,
    LAPTOP: <Laptop className={cls} />,
    TABLET: <Tablet className={cls} />,
    PHONE: <Phone className={cls} />,
    KEY: <Key className={cls} />,
    TOOL: <Wrench className={cls} />,
    EQUIPMENT: <Box className={cls} />,
    OTHER: <Package className={cls} />,
  };
  return map[cat] ?? <Package className={cls} />;
}

function statusBadge(status: AssetStatus) {
  const map: Record<AssetStatus, { label: string; cls: string }> = {
    AVAILABLE:        { label: 'Available',         cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    ASSIGNED:         { label: 'Assigned',           cls: 'bg-sky-100 text-sky-700 border-sky-200' },
    UNDER_MAINTENANCE:{ label: 'In Maintenance',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    RETIRED:          { label: 'Retired',            cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    DAMAGED:          { label: 'Damaged',            cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    LOST:             { label: 'Lost',               cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', s.cls)}>
      {s.label}
    </span>
  );
}

function categoryLabel(cat: AssetCategory) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Create / Edit Dialog ────────────────────────────────────────────────────

function AssetFormDialog({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: Partial<AssetRow> | null;
}) {
  const isEdit = !!initial?.id;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    assetCode: initial?.assetCode ?? '',
    name: initial?.name ?? '',
    category: (initial?.category ?? 'OTHER') as AssetCategory,
    plateNumber: initial?.plateNumber ?? '',
    vehicleMake: initial?.vehicleMake ?? '',
    vehicleModel: initial?.vehicleModel ?? '',
    vehicleYear: initial?.vehicleYear?.toString() ?? '',
    vehicleColor: initial?.vehicleColor ?? '',
    vin: initial?.vin ?? '',
    currentOdometer: initial?.currentOdometer?.toString() ?? '',
    simNumber: initial?.simNumber ?? '',
    mobileNumber: initial?.mobileNumber ?? '',
    carrier: initial?.carrier ?? '',
    serialNumber: initial?.serialNumber ?? '',
    make: initial?.make ?? '',
    model: initial?.model ?? '',
    purchaseDate: initial?.purchaseDate ? initial.purchaseDate.slice(0, 10) : '',
    purchasePrice: initial?.purchasePrice ?? '',
    notes: initial?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        plateNumber: form.plateNumber || null,
        vehicleMake: form.vehicleMake || null,
        vehicleModel: form.vehicleModel || null,
        vehicleYear: form.vehicleYear ? parseInt(form.vehicleYear) : null,
        vehicleColor: form.vehicleColor || null,
        vin: form.vin || null,
        currentOdometer: form.currentOdometer ? parseInt(form.currentOdometer) : null,
        simNumber: form.simNumber || null,
        mobileNumber: form.mobileNumber || null,
        carrier: form.carrier || null,
        serialNumber: form.serialNumber || null,
        make: form.make || null,
        model: form.model || null,
        purchaseDate: form.purchaseDate || null,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
        notes: form.notes || null,
      };
      if (!isEdit) payload.assetCode = form.assetCode;

      const url = isEdit ? `/api/hr/assets/${initial!.id}` : '/api/hr/assets';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
      onSaved();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const isCar = form.category === 'CAR';
  const isSim = form.category === 'SIM_CARD';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Asset' : 'Register New Asset'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update asset details.' : 'Add a new company asset to the registry.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {!isEdit && (
              <div className="space-y-1">
                <Label>Asset Code *</Label>
                <Input value={form.assetCode} onChange={e => set('assetCode', e.target.value)} placeholder="e.g. CAR-001" required />
              </div>
            )}
            <div className={cn('space-y-1', !isEdit ? '' : 'col-span-2')}>
              <Label>Name / Description *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Toyota Hilux White" required />
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isCar && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Vehicle Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Plate Number</Label><Input value={form.plateNumber} onChange={e => set('plateNumber', e.target.value)} placeholder="ABC 1234" /></div>
                <div className="space-y-1"><Label>Make</Label><Input value={form.vehicleMake} onChange={e => set('vehicleMake', e.target.value)} placeholder="Toyota" /></div>
                <div className="space-y-1"><Label>Model</Label><Input value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} placeholder="Hilux" /></div>
                <div className="space-y-1"><Label>Year</Label><Input type="number" value={form.vehicleYear} onChange={e => set('vehicleYear', e.target.value)} placeholder="2023" /></div>
                <div className="space-y-1"><Label>Color</Label><Input value={form.vehicleColor} onChange={e => set('vehicleColor', e.target.value)} placeholder="White" /></div>
                <div className="space-y-1"><Label>VIN</Label><Input value={form.vin} onChange={e => set('vin', e.target.value)} placeholder="Chassis / VIN" /></div>
                <div className="space-y-1 col-span-2"><Label>Current Odometer (km)</Label><Input type="number" value={form.currentOdometer} onChange={e => set('currentOdometer', e.target.value)} placeholder="0" /></div>
              </div>
            </div>
          )}

          {isSim && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">SIM Card Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>SIM Number / ICCID</Label><Input value={form.simNumber} onChange={e => set('simNumber', e.target.value)} /></div>
                <div className="space-y-1"><Label>Mobile Number</Label><Input value={form.mobileNumber} onChange={e => set('mobileNumber', e.target.value)} placeholder="+966 5x xxx xxxx" /></div>
                <div className="space-y-1 col-span-2"><Label>Carrier / Operator</Label><Input value={form.carrier} onChange={e => set('carrier', e.target.value)} placeholder="STC, Mobily, Zain..." /></div>
              </div>
            </div>
          )}

          {!isCar && !isSim && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Serial Number</Label><Input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} /></div>
              <div className="space-y-1"><Label>Make / Brand</Label><Input value={form.make} onChange={e => set('make', e.target.value)} /></div>
              <div className="space-y-1"><Label>Model</Label><Input value={form.model} onChange={e => set('model', e.target.value)} /></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Purchase Date</Label><Input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} /></div>
            <div className="space-y-1"><Label>Purchase Price (SAR)</Label><Input type="number" step="0.01" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} /></div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Register Asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Dialog ────────────────────────────────────────────────────────────

function AssignDialog({
  open,
  asset,
  onClose,
  onSaved,
}: {
  open: boolean;
  asset: AssetRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
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

  const filtered = employees.filter(e =>
    search === '' ||
    e.fullNameEn.toLowerCase().includes(search.toLowerCase()) ||
    e.employmentId.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAssign() {
    if (!asset || !selectedId) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/hr/assets/${asset.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedId, assignedDate: date, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to assign'); return; }
      onSaved();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Asset</DialogTitle>
          <DialogDescription>
            Assign <strong>{asset?.name}</strong> ({asset?.assetCode}) to an employee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Assignment Date *</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Employee *</Label>
            <Input placeholder="Search by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="max-h-48 overflow-y-auto border rounded-lg mt-1 divide-y">
              {filtered.slice(0, 20).map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => { setSelectedId(emp.id); setSearch(emp.fullNameEn); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between',
                    selectedId === emp.id && 'bg-sky-50 text-sky-700'
                  )}
                >
                  <span>{emp.fullNameEn}</span>
                  <span className="text-xs text-slate-400">{emp.employmentId}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="px-3 py-4 text-sm text-slate-400 text-center">No employees found</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes about this assignment..." />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={saving || !selectedId}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign Asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Return Dialog ────────────────────────────────────────────────────────────

function ReturnDialog({
  open,
  asset,
  onClose,
  onSaved,
}: {
  open: boolean;
  asset: AssetRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleReturn() {
    if (!asset) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/hr/assets/${asset.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnedDate: date, returnReason: reason || undefined, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to return'); return; }
      onSaved();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const activeEmp = asset?.assignments?.[0]?.employee;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Return Asset</DialogTitle>
          <DialogDescription>
            Mark <strong>{asset?.name}</strong> as returned
            {activeEmp ? ` from ${activeEmp.fullNameEn}` : ''}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Return Date *</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Return Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason..." /></SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReturn} disabled={saving} variant="default">
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({ open, asset, onClose, onDeleted }: {
  open: boolean; asset: AssetRow | null; onClose: () => void; onDeleted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (!asset) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/hr/assets/${asset.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to delete'); return; }
      onDeleted();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Asset</DialogTitle>
          <DialogDescription>This will soft-delete <strong>{asset?.name}</strong>. Provide a reason.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Reason for removal..." />
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving || !reason.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AssetsClient({ canManage }: Props) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<AssetRow | null>(null);
  const [assignAsset, setAssignAsset] = useState<AssetRow | null>(null);
  const [returnAsset, setReturnAsset] = useState<AssetRow | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<AssetRow | null>(null);
  const [tipDismissed, setTipDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('ots-assets-tip-v1') === '1'
  );

  function dismissTip() {
    localStorage.setItem('ots-assets-tip-v1', '1');
    setTipDismissed(true);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('search', search);
      const res = await fetch(`/api/hr/assets?${params}`);
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  // KPI counts
  const total = assets.length;
  const available = assets.filter(a => a.status === 'AVAILABLE').length;
  const assigned = assets.filter(a => a.status === 'ASSIGNED').length;
  const maintenance = assets.filter(a => a.status === 'UNDER_MAINTENANCE').length;
  const cars = assets.filter(a => a.category === 'CAR').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <PackageSearch className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Asset Registry</h1>
              </div>
              <p className="text-violet-100 text-sm">
                Manage company assets — cars, SIM cards, laptops, keys and more. Track who holds each asset and when.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-white text-violet-700 hover:bg-violet-50 border-0 shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register Asset
              </Button>
            )}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Assets', value: total,       color: 'violet', sub: 'in registry' },
            { label: 'Available',    value: available,    color: 'emerald', sub: 'ready to assign' },
            { label: 'Assigned',     value: assigned,     color: 'sky',     sub: 'with employees' },
            { label: 'In Maintenance', value: maintenance, color: 'amber',  sub: 'being serviced' },
            { label: 'Vehicles',     value: cars,         color: 'rose',    sub: 'company cars' },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-xl border bg-gradient-to-b from-${kpi.color}-50 to-white border-${kpi.color}-200 p-4 shadow-sm`}>
              <p className={`text-xs text-${kpi.color}-600 font-medium uppercase tracking-wide`}>{kpi.label}</p>
              <p className={`text-2xl font-bold text-${kpi.color}-700 mt-1`}>{kpi.value}</p>
              <p className={`text-xs text-${kpi.color}-500 mt-0.5`}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* How-to tip */}
        {!tipDismissed && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 flex items-start gap-4">
            <div className="shrink-0 mt-0.5 p-1.5 bg-violet-100 rounded-lg">
              <ArrowRight className="h-4 w-4 text-violet-600" />
            </div>
            <div className="flex-1 text-sm text-violet-800 space-y-1">
              <p className="font-semibold text-violet-900">How to assign an asset to an employee</p>
              <ol className="list-decimal list-inside space-y-0.5 text-violet-700">
                <li>Click <strong>Register Asset</strong> to add the asset to the registry.</li>
                <li>On the asset card, click the <strong>Assign</strong> button and choose an employee.</li>
                <li>When the asset is returned, click <strong>Return</strong> on the same card and select a reason.</li>
              </ol>
              <p className="text-xs text-violet-500 pt-0.5">You can also see all assets assigned to a specific employee from their Employee File → Assets tab.</p>
            </div>
            <button onClick={dismissTip} className="shrink-0 text-violet-400 hover:text-violet-700 transition-colors" aria-label="Dismiss tip">
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by code, name, plate, serial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterCategory || '__all__'} onValueChange={v => setFilterCategory(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus || '__all__'} onValueChange={v => setFilterStatus(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="AVAILABLE">Available</SelectItem>
              <SelectItem value="ASSIGNED">Assigned</SelectItem>
              <SelectItem value="UNDER_MAINTENANCE">In Maintenance</SelectItem>
              <SelectItem value="RETIRED">Retired</SelectItem>
              <SelectItem value="DAMAGED">Damaged</SelectItem>
              <SelectItem value="LOST">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Asset Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-2xl border bg-white shadow-sm p-12 text-center">
            <PackageSearch className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No assets found</p>
            <p className="text-slate-400 text-sm mt-1">
              {canManage ? 'Click "Register Asset" to add one.' : 'Assets will appear here once added.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map(asset => {
              const activeAssignment = asset.assignments?.[0];
              return (
                <div key={asset.id} className="rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  {/* Card Header */}
                  <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-violet-100 rounded-lg text-violet-600">
                        {categoryIcon(asset.category)}
                      </div>
                      <div>
                        <p className="text-xs font-mono text-slate-500">{asset.assetCode}</p>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{asset.name}</p>
                      </div>
                    </div>
                    {statusBadge(asset.status)}
                  </div>

                  {/* Card Body */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                        {categoryLabel(asset.category)}
                      </span>
                      {asset.category === 'CAR' && asset.plateNumber && (
                        <span className="font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                          {asset.plateNumber}
                        </span>
                      )}
                    </div>

                    {asset.category === 'CAR' && (
                      <div className="text-xs text-slate-600 space-y-0.5">
                        {(asset.vehicleMake || asset.vehicleModel) && (
                          <p>{[asset.vehicleMake, asset.vehicleModel, asset.vehicleYear].filter(Boolean).join(' ')}</p>
                        )}
                        {asset.currentOdometer != null && (
                          <p className="text-slate-400">{asset.currentOdometer.toLocaleString()} km</p>
                        )}
                      </div>
                    )}

                    {asset.category === 'SIM_CARD' && asset.mobileNumber && (
                      <p className="text-xs text-slate-600">{asset.mobileNumber}{asset.carrier ? ` · ${asset.carrier}` : ''}</p>
                    )}

                    {!['CAR','SIM_CARD'].includes(asset.category) && (asset.make || asset.model || asset.serialNumber) && (
                      <p className="text-xs text-slate-600">
                        {[asset.make, asset.model].filter(Boolean).join(' ')}
                        {asset.serialNumber && <span className="text-slate-400"> · S/N: {asset.serialNumber}</span>}
                      </p>
                    )}

                    {/* Assignment Info */}
                    {activeAssignment ? (
                      <div className="flex items-center gap-1.5 text-xs bg-sky-50 border border-sky-200 rounded-lg px-2.5 py-1.5 mt-1">
                        <User className="h-3 w-3 text-sky-500 shrink-0" />
                        <span className="text-sky-700 font-medium">{activeAssignment.employee.fullNameEn}</span>
                        <ArrowRight className="h-3 w-3 text-sky-400" />
                        <Calendar className="h-3 w-3 text-sky-400" />
                        <span className="text-sky-500">{fmtDate(activeAssignment.assignedDate)}</span>
                      </div>
                    ) : asset.status === 'AVAILABLE' ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Ready to assign</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Card Actions */}
                  {canManage && (
                    <div className="px-4 py-2.5 border-t bg-slate-50 flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditAsset(asset)}>
                        <Edit2 className="h-3 w-3 mr-1" />Edit
                      </Button>
                      {asset.status === 'AVAILABLE' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-sky-600 border-sky-200 hover:bg-sky-50" onClick={() => setAssignAsset(asset)}>
                          <User className="h-3 w-3 mr-1" />Assign
                        </Button>
                      )}
                      {asset.status === 'ASSIGNED' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setReturnAsset(asset)}>
                          <RotateCcw className="h-3 w-3 mr-1" />Return
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setDeleteAsset(asset)}>
                        <Trash2 className="h-3 w-3 mr-1" />Remove
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AssetFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={load}
        initial={null}
      />
      {editAsset && (
        <AssetFormDialog
          open={!!editAsset}
          onClose={() => setEditAsset(null)}
          onSaved={load}
          initial={editAsset}
        />
      )}
      <AssignDialog
        open={!!assignAsset}
        asset={assignAsset}
        onClose={() => setAssignAsset(null)}
        onSaved={load}
      />
      <ReturnDialog
        open={!!returnAsset}
        asset={returnAsset}
        onClose={() => setReturnAsset(null)}
        onSaved={load}
      />
      <DeleteDialog
        open={!!deleteAsset}
        asset={deleteAsset}
        onClose={() => setDeleteAsset(null)}
        onDeleted={load}
      />
    </div>
  );
}
