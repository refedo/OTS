'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Settings, Package, Warehouse, MapPin, CheckCircle2, XCircle } from 'lucide-react';

interface InvItem {
  id: string; code: string; name: string; unit: string; category: string;
  defaultWhType: string; minStockLevel: number; isActive: boolean;
}
interface InvWarehouse {
  id: string; code: string; name: string; type: string; siteId: string; siteName: string; isActive: boolean;
}
interface InvLocation {
  id: string; code: string; name: string; siteId: string; isActive: boolean;
}

const CATEGORIES = ['STRUCTURAL_STEEL','PLATE','PIPE','CONSUMABLE','FASTENER','PAINT','ELECTRICAL','OFFCUT','OTHER'];
const WH_TYPES = ['RAW_MATERIAL','CONSUMABLE','OFFCUT'];
const SITES = [{ id: 'F001', label: 'Factory 001' }, { id: 'F003', label: 'Factory 003' }];

function labelify(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

const CATEGORY_COLORS: Record<string, string> = {
  STRUCTURAL_STEEL: 'bg-slate-100 text-slate-700',
  PLATE: 'bg-blue-100 text-blue-700',
  PIPE: 'bg-indigo-100 text-indigo-700',
  CONSUMABLE: 'bg-orange-100 text-orange-700',
  FASTENER: 'bg-yellow-100 text-yellow-700',
  PAINT: 'bg-pink-100 text-pink-700',
  ELECTRICAL: 'bg-purple-100 text-purple-700',
  OFFCUT: 'bg-teal-100 text-teal-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const WH_TYPE_COLORS: Record<string, string> = {
  RAW_MATERIAL: 'bg-indigo-100 text-indigo-700',
  CONSUMABLE:   'bg-orange-100 text-orange-700',
  OFFCUT:       'bg-teal-100 text-teal-700',
};

// ─── Items Tab ────────────────────────────────────────────────────────────────
function ItemsTab() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvItem | null>(null);
  const [form, setForm] = useState({
    code: '', name: '', unit: '', category: 'STRUCTURAL_STEEL',
    defaultWhType: 'RAW_MATERIAL', minStockLevel: '0', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/inv/items?activeOnly=false');
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ code: '', name: '', unit: '', category: 'STRUCTURAL_STEEL', defaultWhType: 'RAW_MATERIAL', minStockLevel: '0', description: '' });
    setError(''); setOpen(true);
  };
  const openEdit = (item: InvItem) => {
    setEditing(item);
    setForm({ code: item.code, name: item.name, unit: item.unit, category: item.category, defaultWhType: item.defaultWhType, minStockLevel: String(item.minStockLevel), description: '' });
    setError(''); setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const body = { ...form, minStockLevel: parseFloat(form.minStockLevel) || 0 };
      const res = editing
        ? await fetch(`/api/inv/items/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/inv/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }
      setOpen(false); load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (item: InvItem) => {
    await fetch(`/api/inv/items/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !item.isActive }) });
    load();
  };

  const active = items.filter(i => i.isActive).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{items.length} items total</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{active} active</span>
          {items.length - active > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{items.length - active} inactive</span>
          )}
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase">Code</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Unit</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Category</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Default Wh</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-right">Min Level</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No items configured yet</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} className={`transition-colors hover:bg-muted/30 ${!item.isActive ? 'opacity-50' : ''}`}>
                <TableCell>
                  <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">{item.code}</span>
                </TableCell>
                <TableCell className="text-sm font-medium max-w-[200px] truncate">{item.name}</TableCell>
                <TableCell>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">{item.unit}</span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-700'}`}>
                    {labelify(item.category)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WH_TYPE_COLORS[item.defaultWhType] || 'bg-gray-100 text-gray-700'}`}>
                    {labelify(item.defaultWhType)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">{item.minStockLevel}</TableCell>
                <TableCell>
                  {item.isActive
                    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> Inactive</span>
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs px-2 ${item.isActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}`}
                      onClick={() => toggleActive(item)}
                    >
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              {editing ? 'Edit Stock Item' : 'New Stock Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="STL-IPE-200" />
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="IPE 200 Universal Column" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit *</Label>
              <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="kg, pcs, m, ltr…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min Stock Level</Label>
              <Input type="number" min={0} value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{labelify(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default Warehouse Type</Label>
              <Select value={form.defaultWhType} onValueChange={v => setForm(f => ({ ...f, defaultWhType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WH_TYPES.map(t => <SelectItem key={t} value={t}>{labelify(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Warehouses Tab ───────────────────────────────────────────────────────────
function WarehousesTab() {
  const [warehouses, setWarehouses] = useState<InvWarehouse[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvWarehouse | null>(null);
  const [form, setForm] = useState({ code: '', name: '', type: 'RAW_MATERIAL', siteId: 'F001', siteName: 'Factory 001' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/inv/warehouses?activeOnly=false');
    const data = await res.json();
    setWarehouses(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ code: '', name: '', type: 'RAW_MATERIAL', siteId: 'F001', siteName: 'Factory 001' });
    setError(''); setOpen(true);
  };
  const openEdit = (wh: InvWarehouse) => {
    setEditing(wh);
    setForm({ code: wh.code, name: wh.name, type: wh.type, siteId: wh.siteId, siteName: wh.siteName });
    setError(''); setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = editing
        ? await fetch(`/api/inv/warehouses/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, siteName: form.siteName }) })
        : await fetch('/api/inv/warehouses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }
      setOpen(false); load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (wh: InvWarehouse) => {
    await fetch(`/api/inv/warehouses/${wh.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !wh.isActive }) });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{warehouses.length} warehouses configured</span>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Warehouse</Button>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase">Code</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Type</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Site</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No warehouses configured</TableCell></TableRow>
            ) : warehouses.map(wh => (
              <TableRow key={wh.id} className={`hover:bg-muted/30 transition-colors ${!wh.isActive ? 'opacity-50' : ''}`}>
                <TableCell>
                  <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">{wh.code}</span>
                </TableCell>
                <TableCell className="text-sm font-medium">{wh.name}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WH_TYPE_COLORS[wh.type] || 'bg-gray-100 text-gray-700'}`}>
                    {labelify(wh.type)}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{wh.siteName}</TableCell>
                <TableCell>
                  {wh.isActive
                    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> Inactive</span>
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(wh)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs px-2 ${wh.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      onClick={() => toggleActive(wh)}
                    >
                      {wh.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-600" />
              {editing ? 'Edit Warehouse' : 'New Warehouse'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code *</Label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="RM-WH-F004" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</Label>
                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{WH_TYPES.map(t => <SelectItem key={t} value={t}>{labelify(t)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Factory</Label>
                    <Select value={form.siteId} onValueChange={v => setForm(f => ({ ...f, siteId: v, siteName: SITES.find(s => s.id === v)?.label || v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SITES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Raw Material Warehouse — Factory 004" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Warehouse'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Locations Tab ────────────────────────────────────────────────────────────
function LocationsTab() {
  const [locations, setLocations] = useState<InvLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvLocation | null>(null);
  const [form, setForm] = useState({ code: '', name: '', siteId: 'F001' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/inv/locations?activeOnly=false');
    const data = await res.json();
    setLocations(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ code: '', name: '', siteId: 'F001' }); setError(''); setOpen(true); };
  const openEdit = (loc: InvLocation) => { setEditing(loc); setForm({ code: loc.code, name: loc.name, siteId: loc.siteId }); setError(''); setOpen(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = editing
        ? await fetch(`/api/inv/locations/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name }) })
        : await fetch('/api/inv/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to save'); return; }
      setOpen(false); load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (loc: InvLocation) => {
    await fetch(`/api/inv/locations/${loc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !loc.isActive }) });
    load();
  };

  const siteLabel = (id: string) => SITES.find(s => s.id === id)?.label ?? id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{locations.length} production locations</span>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Location</Button>
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase">Code</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Factory</TableHead>
              <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No locations configured</TableCell></TableRow>
            ) : locations.map(loc => (
              <TableRow key={loc.id} className={`hover:bg-muted/30 transition-colors ${!loc.isActive ? 'opacity-50' : ''}`}>
                <TableCell>
                  <span className="font-mono text-sm font-semibold text-blue-700 dark:text-blue-400">{loc.code}</span>
                </TableCell>
                <TableCell className="text-sm font-medium">{loc.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{siteLabel(loc.siteId)}</Badge>
                </TableCell>
                <TableCell>
                  {loc.isActive
                    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" /> Inactive</span>
                  }
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(loc)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs px-2 ${loc.isActive ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      onClick={() => toggleActive(loc)}
                    >
                      {loc.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              {editing ? 'Edit Location' : 'New Production Location'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code *</Label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="LOC-F001-FAB-A" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Factory</Label>
                  <Select value={form.siteId} onValueChange={v => setForm(f => ({ ...f, siteId: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SITES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Fabrication Bay A" />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Location'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InvSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b bg-gradient-to-r from-gray-700 via-slate-700 to-zinc-800 text-white">
        <div className="px-6 py-7">
          <div className="flex items-center gap-2 mb-1.5">
            <Settings className="h-5 w-5 opacity-70" />
            <span className="text-slate-300 text-xs font-medium uppercase tracking-wider">Inventory › Settings</span>
          </div>
          <h1 className="text-2xl font-bold">Inventory Settings</h1>
          <p className="text-slate-300 text-sm mt-1">Manage stock items, warehouses, and production locations</p>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="items">
          <TabsList className="mb-5">
            <TabsTrigger value="items" className="gap-1.5">
              <Package className="h-4 w-4" /> Items
            </TabsTrigger>
            <TabsTrigger value="warehouses" className="gap-1.5">
              <Warehouse className="h-4 w-4" /> Warehouses
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-1.5">
              <MapPin className="h-4 w-4" /> Locations
            </TabsTrigger>
          </TabsList>
          <TabsContent value="items"><ItemsTab /></TabsContent>
          <TabsContent value="warehouses"><WarehousesTab /></TabsContent>
          <TabsContent value="locations"><LocationsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
