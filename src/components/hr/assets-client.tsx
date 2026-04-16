'use client';

/**
 * 18.12.0 — Company Asset Registry
 * Manage all company assets (cars, SIM cards, laptops, keys, tools, etc.),
 * assign them to employees, and track assignment history.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  BookOpen,
  Paperclip,
  Upload,
  FileText,
  ImageIcon,
  X,
  Eye,
  ShieldCheck,
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

interface AssetAttachment {
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  label?: string;
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
  licenseExpiryDate: string | null;
  attachments: AssetAttachment[] | null;
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    licenseExpiryDate: initial?.licenseExpiryDate ? initial.licenseExpiryDate.slice(0, 10) : '',
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
  const [attachments, setAttachments] = useState<AssetAttachment[]>(initial?.attachments ?? []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, label?: string) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
        if (res.ok) {
          const data = await res.json();
          setAttachments(prev => [...prev, {
            fileName: data.originalName,
            filePath: data.filePath,
            fileType: data.fileType,
            fileSize: data.fileSize,
            uploadedAt: new Date().toISOString(),
            label: label || undefined,
          }]);
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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
        licenseExpiryDate: form.licenseExpiryDate || null,
        simNumber: form.simNumber || null,
        mobileNumber: form.mobileNumber || null,
        carrier: form.carrier || null,
        serialNumber: form.serialNumber || null,
        make: form.make || null,
        model: form.model || null,
        purchaseDate: form.purchaseDate || null,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
        notes: form.notes || null,
        attachments: attachments.length > 0 ? attachments : null,
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
                <div className="space-y-1"><Label>Current Odometer (km)</Label><Input type="number" value={form.currentOdometer} onChange={e => set('currentOdometer', e.target.value)} placeholder="0" /></div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-sky-600" />License Expiry Date</Label>
                  <Input type="date" value={form.licenseExpiryDate} onChange={e => set('licenseExpiryDate', e.target.value)} />
                </div>
              </div>
              {/* License image upload */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-sky-700">License Image</p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-100"
                    disabled={uploading}
                    onClick={() => {
                      const inp = document.createElement('input');
                      inp.type = 'file';
                      inp.accept = 'image/*,.pdf';
                      inp.onchange = (ev) => handleFileUpload(ev as React.ChangeEvent<HTMLInputElement>, 'License Image');
                      inp.click();
                    }}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload License Image
                  </Button>
                  <span className="text-xs text-slate-400">{attachments.filter(a => a.label === 'License Image').length} uploaded</span>
                </div>
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

          {/* General Attachments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />Attachments ({attachments.length})</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Add File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={e => handleFileUpload(e)}
              />
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1.5">
                {attachments.map((f, i) => {
                  const isImg = f.fileType?.startsWith('image/');
                  const fileUrl = `/api/files?path=${encodeURIComponent(f.filePath)}`;
                  return (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded-lg bg-slate-50">
                      {isImg ? <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" /> : <FileText className="h-4 w-4 text-slate-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{f.fileName}</p>
                        {f.label && <p className="text-xs text-slate-400">{f.label}</p>}
                      </div>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3 w-3" /></Button>
                      </a>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-rose-500 hover:text-rose-700"
                        onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || uploading}>
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

// ─── Assignment History Dialog ────────────────────────────────────────────────

interface AssignmentEntry {
  id: string;
  assignedDate: string;
  returnedDate: string | null;
  returnReason: string | null;
  status: 'ACTIVE' | 'RETURNED';
  notes: string | null;
  employee: { id: string; fullNameEn: string; employmentId: string; occupation: string | null };
  createdBy: { id: string; name: string } | null;
}

function AssetHistoryDialog({ open, asset, onClose }: {
  open: boolean; asset: AssetRow | null; onClose: () => void;
}) {
  const [entries, setEntries] = useState<AssignmentEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!open || !asset) return;
    setLoadingHistory(true);
    fetch(`/api/hr/assets/${asset.id}`)
      .then(r => r.json())
      .then(d => setEntries(Array.isArray(d.assignments) ? d.assignments : []))
      .catch(() => setEntries([]))
      .finally(() => setLoadingHistory(false));
  }, [open, asset]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-violet-500">{asset && categoryIcon(asset.category, 'h-4 w-4')}</span>
            Assignment Log — {asset?.name}
          </DialogTitle>
          <DialogDescription>
            Full history of who held <strong>{asset?.assetCode}</strong> and when.
          </DialogDescription>
        </DialogHeader>

        {loadingHistory ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Clock className="h-10 w-10 text-slate-200 mx-auto" />
            <p className="text-slate-400 text-sm">No assignment history yet.</p>
          </div>
        ) : (
          <div className="relative mt-1">
            {/* vertical timeline spine */}
            <div className="absolute left-[10px] top-1 bottom-4 w-px bg-slate-200" />

            <div className="space-y-3">
              {entries.map(a => {
                const isCurrent = a.status === 'ACTIVE';
                const returnLabel = RETURN_REASONS.find(r => r.value === a.returnReason)?.label;
                return (
                  <div key={a.id} className="relative pl-8">
                    {/* timeline dot */}
                    <div className={cn(
                      'absolute left-0 top-2 h-5 w-5 rounded-full border-2 flex items-center justify-center',
                      isCurrent
                        ? 'bg-sky-500 border-sky-500'
                        : 'bg-white border-slate-300'
                    )}>
                      {isCurrent && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>

                    <div className={cn(
                      'rounded-xl border p-3.5 space-y-2',
                      isCurrent ? 'bg-sky-50 border-sky-200' : 'bg-white border-slate-200'
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {a.employee.fullNameEn}
                            <span className="ml-1.5 text-xs font-mono text-slate-400">{a.employee.employmentId}</span>
                          </p>
                          {a.employee.occupation && (
                            <p className="text-xs text-slate-500 mt-0.5">{a.employee.occupation}</p>
                          )}
                        </div>
                        {isCurrent ? (
                          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 border border-sky-200">
                            Currently Assigned
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Returned
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Assigned {fmtDate(a.assignedDate)}
                        </span>
                        {a.returnedDate && (
                          <span className="flex items-center gap-1">
                            <RotateCcw className="h-3 w-3 text-slate-400" />
                            Returned {fmtDate(a.returnedDate)}
                          </span>
                        )}
                      </div>

                      {returnLabel && (
                        <p className="text-xs text-slate-400">
                          Return reason: <span className="text-slate-600 font-medium">{returnLabel}</span>
                        </p>
                      )}
                      {a.notes && <p className="text-xs text-slate-400 italic">"{a.notes}"</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Assignment Log Tab ────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  assignedDate: string;
  returnedDate: string | null;
  returnReason: string | null;
  status: 'ACTIVE' | 'RETURNED';
  notes: string | null;
  asset: {
    id: string; assetCode: string; name: string; category: AssetCategory;
    plateNumber: string | null;
  };
  employee: { id: string; fullNameEn: string; employmentId: string } | null;
  createdBy: { id: string; name: string } | null;
}

function calcDuration(assigned: string, returned: string | null): string {
  if (!returned) return 'Ongoing';
  const days = Math.round((new Date(returned).getTime() - new Date(assigned).getTime()) / 86400000);
  return `${days} day${days !== 1 ? 's' : ''}`;
}

function AssignmentLogTab({ active }: { active: boolean }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logStatus, setLogStatus] = useState('__all__');
  const [logCategory, setLogCategory] = useState('__all__');

  const loadLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (logSearch) params.set('search', logSearch);
      if (logStatus !== '__all__') params.set('status', logStatus);
      if (logCategory !== '__all__') params.set('category', logCategory);
      const res = await fetch(`/api/hr/asset-assignments?${params}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [logSearch, logStatus, logCategory]);

  // Lazy-load on first activation, then re-fetch when filters change
  useEffect(() => {
    if (active && !loaded) loadLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (loaded) loadLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logSearch, logStatus, logCategory]);

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b bg-slate-50/50">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search employee, asset code, asset name…"
            className="pl-9"
            value={logSearch}
            onChange={e => setLogSearch(e.target.value)}
          />
        </div>
        <Select value={logStatus} onValueChange={setLogStatus}>
          <SelectTrigger className="w-36 shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={logCategory} onValueChange={setLogCategory}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {!loading && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Clock className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No assignment records found</p>
            <p className="text-sm mt-1">Assign an asset to an employee to start the log.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Asset</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Returned</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Return Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-violet-50/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-violet-100 rounded text-violet-600 shrink-0">
                        {categoryIcon(e.asset.category, 'h-3.5 w-3.5')}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{e.asset.name}</p>
                        <p className="text-xs font-mono text-slate-400">{e.asset.assetCode}</p>
                        {e.asset.plateNumber && (
                          <p className="text-xs text-amber-600">{e.asset.plateNumber}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {e.employee ? (
                      <div>
                        <p className="text-slate-700">{e.employee.fullNameEn}</p>
                        <p className="text-xs text-slate-400">{e.employee.employmentId}</p>
                      </div>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full border',
                      e.status === 'ACTIVE'
                        ? 'bg-sky-100 text-sky-700 border-sky-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    )}>
                      {e.status === 'ACTIVE' ? 'Active' : 'Returned'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDate(e.assignedDate)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{e.returnedDate ? fmtDate(e.returnedDate) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{calcDuration(e.assignedDate, e.returnedDate)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {e.returnReason ? RETURN_REASONS.find(r => r.value === e.returnReason)?.label ?? e.returnReason : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
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
  const [historyAsset, setHistoryAsset] = useState<AssetRow | null>(null);
  const [tipDismissed, setTipDismissed] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('ots-assets-tip-v1') === '1'
  );
  const [activeTab, setActiveTab] = useState('registry');

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

        {/* Registry / Assignment Log tabs */}
        <Tabs defaultValue="registry" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="registry" className="flex items-center gap-1.5">
              <PackageSearch className="h-4 w-4" />
              Registry
            </TabsTrigger>
            <TabsTrigger value="log" className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              Assignment Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registry">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center mb-6">
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
                            {asset.licenseExpiryDate && (() => {
                              const exp = new Date(asset.licenseExpiryDate);
                              const days = Math.round((exp.getTime() - Date.now()) / 86400000);
                              const cls = days < 0 ? 'text-rose-700 bg-rose-50 border-rose-200'
                                : days <= 7 ? 'text-rose-600 bg-rose-50 border-rose-200'
                                : days <= 30 ? 'text-amber-600 bg-amber-50 border-amber-200'
                                : 'text-emerald-600 bg-emerald-50 border-emerald-200';
                              return (
                                <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium', cls)}>
                                  <ShieldCheck className="h-3 w-3" />
                                  License: {fmtDate(asset.licenseExpiryDate)}
                                  {days < 0 ? ' (Expired)' : days <= 30 ? ` (${days}d)` : ''}
                                </span>
                              );
                            })()}
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
                      <div className="px-4 py-2.5 border-t bg-slate-50 flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-violet-600 border-violet-200 hover:bg-violet-50" onClick={() => setHistoryAsset(asset)}>
                          <Clock className="h-3 w-3 mr-1" />Log
                        </Button>
                        {canManage && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="log">
            <AssignmentLogTab active={activeTab === 'log'} />
          </TabsContent>
        </Tabs>
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
      <AssetHistoryDialog
        open={!!historyAsset}
        asset={historyAsset}
        onClose={() => setHistoryAsset(null)}
      />
    </div>
  );
}
