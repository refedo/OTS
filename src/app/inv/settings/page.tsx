'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil } from 'lucide-react';

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

function CategoryLabel(c: string) {
  return c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ─── Items Tab ────────────────────────────────────────────────────────────────
function ItemsTab() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvItem | null>(null);
  const [form, setForm] = useState({ code: '', name: '', unit: '', category: 'STRUCTURAL_STEEL', defaultWhType: 'RAW_MATERIAL', minStockLevel: '0', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/inv/items?activeOnly=false');
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ code: '', name: '', unit: '', category: 'STRUCTURAL_STEEL', defaultWhType: 'RAW_MATERIAL', minStockLevel: '0', description: '' }); setError(''); setOpen(true); };
  const openEdit = (item: InvItem) => { setEditing(item); setForm({ code: item.code, name: item.name, unit: item.unit, category: item.category, defaultWhType: item.defaultWhType, minStockLevel: String(item.minStockLevel), description: '' }); setError(''); setOpen(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const body = { ...form, minStockLevel: parseFloat(form.minStockLevel) || 0 };
      const res = editing
        ? await fetch(`/api/inv/items/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/inv/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setOpen(false);
      load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (item: InvItem) => {
    await fetch(`/api/inv/items/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !item.isActive }) });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><div /><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Item</Button></div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Unit</TableHead>
          <TableHead>Category</TableHead><TableHead>Wh Type</TableHead><TableHead className="text-right">Min Level</TableHead>
          <TableHead>Status</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {items.map(item => (
            <TableRow key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
              <TableCell className="font-mono text-sm">{item.code}</TableCell>
              <TableCell className="text-sm">{item.name}</TableCell>
              <TableCell className="text-sm">{item.unit}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{CategoryLabel(item.category)}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{item.defaultWhType.replace('_', ' ')}</TableCell>
              <TableCell className="text-right font-mono text-sm">{item.minStockLevel}</TableCell>
              <TableCell><Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">{item.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleActive(item)}>{item.isActive ? 'Deactivate' : 'Activate'}</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Item' : 'New Stock Item'}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            {!editing && (
              <div className="space-y-1"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="STL-IPE-200" /></div>
            )}
            <div className="space-y-1 sm:col-span-2"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Unit *</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="kg, pcs, m, ltr..." /></div>
            <div className="space-y-1"><Label>Min Stock Level</Label><Input type="number" min={0} value={form.minStockLevel} onChange={e => setForm(f => ({ ...f, minStockLevel: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CategoryLabel(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Default Warehouse Type</Label>
              <Select value={form.defaultWhType} onValueChange={v => setForm(f => ({ ...f, defaultWhType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WH_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
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

  const openNew = () => { setEditing(null); setForm({ code: '', name: '', type: 'RAW_MATERIAL', siteId: 'F001', siteName: 'Factory 001' }); setError(''); setOpen(true); };
  const openEdit = (wh: InvWarehouse) => { setEditing(wh); setForm({ code: wh.code, name: wh.name, type: wh.type, siteId: wh.siteId, siteName: wh.siteName }); setError(''); setOpen(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = editing
        ? await fetch(`/api/inv/warehouses/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, siteName: form.siteName }) })
        : await fetch('/api/inv/warehouses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setOpen(false); load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (wh: InvWarehouse) => {
    await fetch(`/api/inv/warehouses/${wh.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !wh.isActive }) });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><div /><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Warehouse</Button></div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead>
          <TableHead>Site</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {warehouses.map(wh => (
            <TableRow key={wh.id} className={!wh.isActive ? 'opacity-50' : ''}>
              <TableCell className="font-mono text-sm">{wh.code}</TableCell>
              <TableCell className="text-sm">{wh.name}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs">{wh.type.replace('_', ' ')}</Badge></TableCell>
              <TableCell className="text-sm">{wh.siteName}</TableCell>
              <TableCell><Badge variant={wh.isActive ? 'default' : 'secondary'} className="text-xs">{wh.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(wh)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleActive(wh)}>{wh.isActive ? 'Deactivate' : 'Activate'}</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editing && <><div className="space-y-1"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="RM-WH-F004" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WH_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label>Factory</Label>
                  <Select value={form.siteId} onValueChange={v => setForm(f => ({ ...f, siteId: v, siteName: SITES.find(s => s.id === v)?.label || v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SITES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
                </div>
              </div>
            </>}
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
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
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setOpen(false); load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (loc: InvLocation) => {
    await fetch(`/api/inv/locations/${loc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !loc.isActive }) });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><div /><Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Location</Button></div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Factory</TableHead>
          <TableHead>Status</TableHead><TableHead></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {locations.map(loc => (
            <TableRow key={loc.id} className={!loc.isActive ? 'opacity-50' : ''}>
              <TableCell className="font-mono text-sm">{loc.code}</TableCell>
              <TableCell className="text-sm">{loc.name}</TableCell>
              <TableCell className="text-sm">{loc.siteId === 'F001' ? 'Factory 001' : loc.siteId === 'F003' ? 'Factory 003' : loc.siteId}</TableCell>
              <TableCell><Badge variant={loc.isActive ? 'default' : 'secondary'} className="text-xs">{loc.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleActive(loc)}>{loc.isActive ? 'Deactivate' : 'Activate'}</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Location' : 'New Production Location'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!editing && <>
              <div className="space-y-1"><Label>Code *</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="LOC-F004-FAB" /></div>
              <div className="space-y-1"><Label>Factory</Label>
                <Select value={form.siteId} onValueChange={v => setForm(f => ({ ...f, siteId: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SITES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent></Select>
              </div>
            </>}
            <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function InvSettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage stock items, warehouses, and production locations</p>
      </div>
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>
        <TabsContent value="items"><Card><CardContent className="pt-6"><ItemsTab /></CardContent></Card></TabsContent>
        <TabsContent value="warehouses"><Card><CardContent className="pt-6"><WarehousesTab /></CardContent></Card></TabsContent>
        <TabsContent value="locations"><Card><CardContent className="pt-6"><LocationsTab /></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
