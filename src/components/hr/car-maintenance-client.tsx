'use client';

/**
 * 18.12.0 — Car Maintenance Sheet
 * Comprehensive vehicle maintenance tracking: oil changes, brake service,
 * tires, AC, battery, general service, inspections, odometer readings, etc.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Wrench, Plus, Search, Car, Gauge, Calendar, DollarSign, MapPin,
  Loader2, Edit2, Trash2, ChevronDown, ChevronUp, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type MaintenanceType =
  | 'OIL_CHANGE' | 'BRAKE_SERVICE' | 'TIRE_ROTATION' | 'TIRE_REPLACEMENT'
  | 'BATTERY_REPLACEMENT' | 'AC_SERVICE' | 'GENERAL_SERVICE' | 'INSPECTION'
  | 'REPAIR' | 'ACCIDENT_REPAIR' | 'FILTER_REPLACEMENT' | 'SPARK_PLUGS'
  | 'TRANSMISSION_SERVICE' | 'COOLANT_FLUSH' | 'OTHER';

interface MaintenanceRow {
  id: string;
  assetId: string;
  maintenanceDate: string;
  maintenanceType: MaintenanceType;
  description: string;
  serviceCenter: string | null;
  odometer: number | null;
  cost: string | null;
  nextServiceDate: string | null;
  nextServiceOdometer: number | null;
  partsReplaced: string | null;
  invoiceNumber: string | null;
  technician: string | null;
  notes: string | null;
  createdAt: string;
  asset: {
    id: string; assetCode: string; name: string;
    plateNumber: string | null; vehicleMake: string | null; vehicleModel: string | null; vehicleYear: number | null;
  };
  createdBy: { id: string; name: string } | null;
}

interface CarOption {
  id: string; assetCode: string; name: string;
  plateNumber: string | null; vehicleMake: string | null; vehicleModel: string | null; vehicleYear: number | null;
}

interface Props { canManage: boolean; }

// ─── Constants ───────────────────────────────────────────────────────────────

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string; color: string }[] = [
  { value: 'OIL_CHANGE',           label: 'Oil Change',            color: 'amber' },
  { value: 'BRAKE_SERVICE',        label: 'Brake Service',         color: 'rose' },
  { value: 'TIRE_ROTATION',        label: 'Tire Rotation',         color: 'slate' },
  { value: 'TIRE_REPLACEMENT',     label: 'Tire Replacement',      color: 'slate' },
  { value: 'BATTERY_REPLACEMENT',  label: 'Battery Replacement',   color: 'sky' },
  { value: 'AC_SERVICE',           label: 'A/C Service',           color: 'sky' },
  { value: 'GENERAL_SERVICE',      label: 'General Service',       color: 'emerald' },
  { value: 'INSPECTION',           label: 'Inspection',            color: 'violet' },
  { value: 'REPAIR',               label: 'Repair',                color: 'orange' },
  { value: 'ACCIDENT_REPAIR',      label: 'Accident Repair',       color: 'red' },
  { value: 'FILTER_REPLACEMENT',   label: 'Filter Replacement',    color: 'amber' },
  { value: 'SPARK_PLUGS',          label: 'Spark Plugs',           color: 'amber' },
  { value: 'TRANSMISSION_SERVICE', label: 'Transmission Service',  color: 'indigo' },
  { value: 'COOLANT_FLUSH',        label: 'Coolant Flush',         color: 'sky' },
  { value: 'OTHER',                label: 'Other',                 color: 'slate' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function typeBadge(type: MaintenanceType) {
  const t = MAINTENANCE_TYPES.find(m => m.value === type) ?? { label: type, color: 'slate' };
  const colorMap: Record<string, string> = {
    amber:   'bg-amber-100 text-amber-700 border-amber-200',
    rose:    'bg-rose-100 text-rose-700 border-rose-200',
    slate:   'bg-slate-100 text-slate-600 border-slate-200',
    sky:     'bg-sky-100 text-sky-700 border-sky-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    violet:  'bg-violet-100 text-violet-700 border-violet-200',
    orange:  'bg-orange-100 text-orange-700 border-orange-200',
    red:     'bg-red-100 text-red-700 border-red-200',
    indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', colorMap[t.color] ?? colorMap.slate)}>
      {t.label}
    </span>
  );
}

function money(v: string | number | null) {
  if (v == null) return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? '—' : `SAR ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Maintenance Form Dialog ──────────────────────────────────────────────────

function MaintenanceFormDialog({ open, onClose, onSaved, initial, preselectedCar }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  initial: Partial<MaintenanceRow> | null; preselectedCar?: CarOption;
}) {
  const isEdit = !!initial?.id;
  const [cars, setCars] = useState<CarOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    assetId: initial?.assetId ?? preselectedCar?.id ?? '',
    maintenanceDate: initial?.maintenanceDate ? initial.maintenanceDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    maintenanceType: (initial?.maintenanceType ?? 'GENERAL_SERVICE') as MaintenanceType,
    description: initial?.description ?? '',
    serviceCenter: initial?.serviceCenter ?? '',
    odometer: initial?.odometer?.toString() ?? '',
    cost: initial?.cost ?? '',
    nextServiceDate: initial?.nextServiceDate ? initial.nextServiceDate.slice(0, 10) : '',
    nextServiceOdometer: initial?.nextServiceOdometer?.toString() ?? '',
    partsReplaced: initial?.partsReplaced ?? '',
    invoiceNumber: initial?.invoiceNumber ?? '',
    technician: initial?.technician ?? '',
    notes: initial?.notes ?? '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    fetch('/api/hr/assets?category=CAR').then(r => r.json()).then(d => setCars(Array.isArray(d) ? d : [])).catch(() => {});
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        assetId: form.assetId,
        maintenanceDate: form.maintenanceDate,
        maintenanceType: form.maintenanceType,
        description: form.description,
        serviceCenter: form.serviceCenter || undefined,
        odometer: form.odometer ? parseInt(form.odometer) : undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
        nextServiceDate: form.nextServiceDate || undefined,
        nextServiceOdometer: form.nextServiceOdometer ? parseInt(form.nextServiceOdometer) : undefined,
        partsReplaced: form.partsReplaced || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        technician: form.technician || undefined,
        notes: form.notes || undefined,
      };
      const url = isEdit ? `/api/hr/car-maintenance/${initial!.id}` : '/api/hr/car-maintenance';
      const res = await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
      onSaved(); onClose();
    } catch { setError('Network error'); } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Maintenance Record' : 'Log Maintenance'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update this service record.' : 'Record a vehicle maintenance or service entry.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Vehicle */}
          <div className="space-y-1">
            <Label>Vehicle *</Label>
            <Select value={form.assetId} onValueChange={v => set('assetId', v)} disabled={!!preselectedCar}>
              <SelectTrigger><SelectValue placeholder="Select vehicle..." /></SelectTrigger>
              <SelectContent>
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
              <Label>Date *</Label>
              <Input type="date" value={form.maintenanceDate} onChange={e => set('maintenanceDate', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Maintenance Type *</Label>
              <Select value={form.maintenanceType} onValueChange={v => set('maintenanceType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Description *</Label>
              <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of work performed" required />
            </div>
          </div>

          {/* Service Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Service Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Service Center / Workshop</Label><Input value={form.serviceCenter} onChange={e => set('serviceCenter', e.target.value)} placeholder="Al-Rashid Auto, Toyota Service..." /></div>
              <div className="space-y-1"><Label>Technician</Label><Input value={form.technician} onChange={e => set('technician', e.target.value)} /></div>
              <div className="space-y-1"><Label>Odometer at Service (km)</Label><Input type="number" value={form.odometer} onChange={e => set('odometer', e.target.value)} placeholder="e.g. 45000" /></div>
              <div className="space-y-1"><Label>Cost (SAR)</Label><Input type="number" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} /></div>
              <div className="space-y-1"><Label>Invoice / Receipt No.</Label><Input value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} /></div>
            </div>
          </div>

          {/* Next Service */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Next Service Reminder</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Next Service Date</Label><Input type="date" value={form.nextServiceDate} onChange={e => set('nextServiceDate', e.target.value)} /></div>
              <div className="space-y-1"><Label>Next Service Odometer (km)</Label><Input type="number" value={form.nextServiceOdometer} onChange={e => set('nextServiceOdometer', e.target.value)} /></div>
            </div>
          </div>

          {/* Parts & Notes */}
          <div className="space-y-1">
            <Label>Parts Replaced</Label>
            <Input value={form.partsReplaced} onChange={e => set('partsReplaced', e.target.value)} placeholder="e.g. Air filter, Cabin filter, Brake pads (front)" />
          </div>
          <div className="space-y-1">
            <Label>Additional Notes</Label>
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.assetId}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Log Maintenance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({ open, record, onClose, onDeleted }: {
  open: boolean; record: MaintenanceRow | null; onClose: () => void; onDeleted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function handleDelete() {
    if (!record) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/hr/car-maintenance/${record.id}`, {
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
        <DialogHeader><DialogTitle>Delete Record</DialogTitle><DialogDescription>Provide a reason.</DialogDescription></DialogHeader>
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

// ─── Maintenance Record Card ──────────────────────────────────────────────────

function RecordCard({ record, canManage, onEdit, onDelete }: {
  record: MaintenanceRow; canManage: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Left: type badge + date */}
        <div className="flex flex-col items-start gap-1 min-w-[160px]">
          {typeBadge(record.maintenanceType)}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3" />{fmtDate(record.maintenanceDate)}
          </div>
          {record.odometer != null && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Gauge className="h-3 w-3" />{record.odometer.toLocaleString()} km
            </div>
          )}
        </div>

        {/* Center: description + vehicle */}
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-slate-800">{record.description}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Car className="h-3 w-3" />
            <span>{record.asset.name}</span>
            {record.asset.plateNumber && <span className="font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">{record.asset.plateNumber}</span>}
          </div>
          {record.serviceCenter && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />{record.serviceCenter}
              {record.technician && <span>· {record.technician}</span>}
            </div>
          )}

          {/* Expandable details */}
          {expanded && (
            <div className="mt-2 space-y-1 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
              {record.partsReplaced && <p><span className="font-medium text-slate-700">Parts:</span> {record.partsReplaced}</p>}
              {record.invoiceNumber && <p><span className="font-medium text-slate-700">Invoice:</span> {record.invoiceNumber}</p>}
              {record.nextServiceDate && <p><span className="font-medium text-slate-700">Next service:</span> {fmtDate(record.nextServiceDate)}{record.nextServiceOdometer ? ` or ${record.nextServiceOdometer.toLocaleString()} km` : ''}</p>}
              {record.notes && <p className="italic">{record.notes}</p>}
              <p className="text-slate-400">Logged by {record.createdBy?.name ?? '—'} on {fmtDate(record.createdAt)}</p>
            </div>
          )}

          {(record.partsReplaced || record.invoiceNumber || record.nextServiceDate || record.notes) && (
            <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Less' : 'More details'}
            </button>
          )}
        </div>

        {/* Right: cost + actions */}
        <div className="flex items-center gap-3">
          {record.cost != null && (
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-700">{money(record.cost)}</p>
            </div>
          )}
          {canManage && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CarMaintenanceClient({ canManage }: Props) {
  const [records, setRecords] = useState<MaintenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCar, setFilterCar] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [cars, setCars] = useState<CarOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MaintenanceRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<MaintenanceRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCar) params.set('assetId', filterCar);
      if (filterType) params.set('type', filterType);
      const res = await fetch(`/api/hr/car-maintenance?${params}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { setRecords([]); } finally { setLoading(false); }
  }, [filterCar, filterType]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/hr/assets?category=CAR').then(r => r.json()).then(d => setCars(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const filtered = records.filter(r =>
    search === '' ||
    r.description.toLowerCase().includes(search.toLowerCase()) ||
    r.asset.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.asset.plateNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.serviceCenter ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = records.reduce((s, r) => s + (r.cost ? parseFloat(r.cost) : 0), 0);
  const oilChanges = records.filter(r => r.maintenanceType === 'OIL_CHANGE').length;
  const repairs = records.filter(r => ['REPAIR', 'ACCIDENT_REPAIR'].includes(r.maintenanceType)).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Wrench className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Car Maintenance</h1>
              </div>
              <p className="text-emerald-100 text-sm">
                Comprehensive vehicle service log — oil changes, brake service, tires, AC, inspections, and more.
              </p>
            </div>
            {canManage && (
              <Button onClick={() => setCreateOpen(true)} className="bg-white text-emerald-700 hover:bg-emerald-50 border-0 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />Log Maintenance
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Records</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{records.length}</p>
            <p className="text-xs text-emerald-500 mt-0.5">service entries</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Oil Changes</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{oilChanges}</p>
            <p className="text-xs text-amber-500 mt-0.5">logged</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Repairs</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{repairs}</p>
            <p className="text-xs text-rose-500 mt-0.5">incl. accident repair</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Cost</p>
            <p className="text-xl font-bold text-violet-700 mt-1">SAR {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-violet-500 mt-0.5">all time</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search description, vehicle, center..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterCar} onValueChange={setFilterCar}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All vehicles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All vehicles</SelectItem>
              {cars.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.plateNumber ? ` · ${c.plateNumber}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              {MAINTENANCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Records */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white shadow-sm p-12 text-center">
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No maintenance records found</p>
            <p className="text-slate-400 text-sm mt-1">
              {canManage ? 'Click "Log Maintenance" to record a service entry.' : 'Records will appear here once added.'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                Service Records ({filtered.length})
              </h2>
            </div>
            <div>
              {filtered.map(record => (
                <RecordCard
                  key={record.id}
                  record={record}
                  canManage={canManage}
                  onEdit={() => setEditRow(record)}
                  onDelete={() => setDeleteRow(record)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <MaintenanceFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={load} initial={null} />
      {editRow && <MaintenanceFormDialog open={!!editRow} onClose={() => setEditRow(null)} onSaved={load} initial={editRow} />}
      <DeleteDialog open={!!deleteRow} record={deleteRow} onClose={() => setDeleteRow(null)} onDeleted={load} />
    </div>
  );
}
