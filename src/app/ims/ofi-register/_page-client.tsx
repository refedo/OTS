'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { IsoClauseNote } from '@/components/ims/IsoClauseNote';
import { Lightbulb, Plus, RefreshCw, Loader2, Search, Eye, Edit2, Filter } from 'lucide-react';

type OfiEntry = {
  id: string;
  findingNumber: string;
  auditId: string | null;
  auditNumber: string | null;
  findingType: string;
  processArea: string;
  description: string;
  potentialBenefit: string | null;
  assignedTo: { id: string; name: string } | null;
  targetReviewDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

const PROCESS_AREAS = ['Engineering', 'Supply Chain', 'Projects', 'Sales', 'Production', 'HSE', 'HR', 'Finance', 'Management'];

const OFI_STATUSES = ['Open', 'Under consideration', 'Adopted', 'Deferred', 'Closed — no action'];

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  'Open':                  { cls: 'bg-orange-100 text-orange-700',   label: 'Open' },
  'Under consideration':   { cls: 'bg-blue-100 text-blue-700',       label: 'Under consideration' },
  'Adopted':               { cls: 'bg-green-100 text-green-700',     label: 'Adopted' },
  'Deferred':              { cls: 'bg-slate-100 text-slate-700',     label: 'Deferred' },
  'Closed — no action':    { cls: 'bg-gray-100 text-gray-600',       label: 'Closed — no action' },
};

function StatusBadge({ s }: { s: string }) {
  const c = STATUS_CFG[s] ?? { cls: 'bg-gray-100 text-gray-700', label: s };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${c.cls}`}>{c.label}</span>;
}

function TypeBadge({ t }: { t: string }) {
  if (t === 'OFI') return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">OFI</span>;
  return <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-medium">Observation</span>;
}

type CreateForm = {
  findingType: string;
  processArea: string;
  description: string;
  potentialBenefit: string;
  assignedToId: string;
  targetReviewDate: string;
  notes: string;
  auditNumber: string;
};

type EditForm = {
  status: string;
  findingType: string;
  processArea: string;
  description: string;
  potentialBenefit: string;
  assignedToId: string;
  targetReviewDate: string;
  notes: string;
  auditNumber: string;
};

const EMPTY_CREATE: CreateForm = {
  findingType: 'OFI',
  processArea: 'Engineering',
  description: '',
  potentialBenefit: '',
  assignedToId: '',
  targetReviewDate: '',
  notes: '',
  auditNumber: '',
};

export function OfiRegisterClient() {
  const [entries, setEntries] = useState<OfiEntry[]>([]);
  const [filtered, setFiltered] = useState<OfiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [processAreaF, setProcessAreaF] = useState('all');
  const [typeF, setTypeF] = useState('all');

  const [createDialog, setCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);

  const [viewDialog, setViewDialog] = useState(false);
  const [selected, setSelected] = useState<OfiEntry | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    status: '',
    findingType: '',
    processArea: '',
    description: '',
    potentialBenefit: '',
    assignedToId: '',
    targetReviewDate: '',
    notes: '',
    auditNumber: '',
  });
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [entriesRes, usersRes] = await Promise.all([
      fetch('/api/ims/ofi-register'),
      fetch('/api/users'),
    ]);
    if (entriesRes.ok) setEntries(await entriesRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let f = [...entries];
    if (statusF !== 'all') f = f.filter(e => e.status === statusF);
    if (processAreaF !== 'all') f = f.filter(e => e.processArea === processAreaF);
    if (typeF !== 'all') f = f.filter(e => e.findingType === typeF);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(e =>
        e.findingNumber.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q)
      );
    }
    setFiltered(f);
  }, [entries, statusF, processAreaF, typeF, search]);

  const stats = {
    total: entries.length,
    open: entries.filter((e: OfiEntry) => e.status === 'Open').length,
    adopted: entries.filter((e: OfiEntry) => e.status === 'Adopted').length,
    deferredClosed: entries.filter((e: OfiEntry) => e.status === 'Deferred' || e.status === 'Closed — no action').length,
  };

  const createEntry = async () => {
    if (!form.description || !form.processArea) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ims/ofi-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findingType: form.findingType,
          processArea: form.processArea,
          description: form.description,
          potentialBenefit: form.potentialBenefit || null,
          assignedToId: form.assignedToId || null,
          targetReviewDate: form.targetReviewDate ? new Date(form.targetReviewDate).toISOString() : null,
          notes: form.notes || null,
          auditNumber: form.auditNumber || null,
        }),
      });
      if (res.ok) {
        setCreateDialog(false);
        setForm(EMPTY_CREATE);
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  };

  const openView = (entry: OfiEntry) => {
    setSelected(entry);
    setEditForm({
      status: entry.status,
      findingType: entry.findingType,
      processArea: entry.processArea,
      description: entry.description,
      potentialBenefit: entry.potentialBenefit ?? '',
      assignedToId: entry.assignedTo?.id ?? '',
      targetReviewDate: entry.targetReviewDate ? entry.targetReviewDate.split('T')[0] : '',
      notes: entry.notes ?? '',
      auditNumber: entry.auditNumber ?? '',
    });
    setViewDialog(true);
  };

  const updateEntry = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/ims/ofi-register/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          findingType: editForm.findingType,
          processArea: editForm.processArea,
          description: editForm.description,
          potentialBenefit: editForm.potentialBenefit || null,
          assignedToId: editForm.assignedToId || null,
          targetReviewDate: editForm.targetReviewDate ? new Date(editForm.targetReviewDate).toISOString() : null,
          notes: editForm.notes || null,
          auditNumber: editForm.auditNumber || null,
        }),
      });
      if (res.ok) { setViewDialog(false); fetchData(); }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-5 w-5 text-slate-300" />
              <span className="text-slate-300 text-xs font-semibold uppercase tracking-widest">IMS — Integrated Management System</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">OFI &amp; Observation Register</h1>
            <p className="text-slate-300 mt-0.5 text-sm">Opportunities for Improvement and audit observations tracking</p>
            <p className="text-slate-400/70 text-xs font-mono mt-1">
              HEXA-FRM-024 · Procedure: Hexa-ISP-004
            </p>
          </div>
          <Button
            className="bg-white text-[#2c3e50] hover:bg-slate-100 font-semibold shadow shrink-0"
            onClick={() => setCreateDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add OFI
          </Button>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-ofi-register"
        clauses={[
          { standard: 'ISO 9001:2015', clause: '§9.2', title: 'Internal audit' },
          { standard: 'ISO 9001:2015', clause: '§10.3', title: 'Continual improvement' },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',            value: stats.total,          icon: Lightbulb,  color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200' },
          { label: 'Open',             value: stats.open,           icon: Plus,       color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
          { label: 'Adopted',          value: stats.adopted,        icon: Edit2,      color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
          { label: 'Deferred / Closed', value: stats.deferredClosed, icon: Filter,   color: 'text-slate-500',  bg: 'bg-gray-50 border-gray-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 flex items-center gap-3 ${s.bg}`}>
            <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
            <div>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4" />Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search finding number or description…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeF}
              onChange={e => setTypeF(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="all">All Types</option>
              <option value="OFI">OFI</option>
              <option value="Observation">Observation</option>
            </select>
            <select
              value={processAreaF}
              onChange={e => setProcessAreaF(e.target.value)}
              className="h-10 px-3 rounded-md border bg-background text-sm"
            >
              <option value="all">All Process Areas</option>
              {PROCESS_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {['all', ...OFI_STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setStatusF(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  statusF === s
                    ? 'bg-[#2c3e50] text-white border-[#2c3e50]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {s === 'all' ? 'All Statuses' : s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-400" />
              <p className="text-slate-400 text-sm">Loading OFI register…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Lightbulb className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 text-sm">No entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#2c3e50] text-white">
                    {['Finding #', 'Type', 'Process Area', 'Description', 'Assigned To', 'Target Date', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openView(entry)}>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-xs text-[#2c3e50] bg-[#2c3e50]/8 px-2 py-0.5 rounded">
                          {entry.findingNumber}
                        </span>
                        {entry.auditNumber && (
                          <p className="text-xs text-slate-400 mt-0.5">Audit: {entry.auditNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TypeBadge t={entry.findingType} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{entry.processArea}</td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="truncate text-slate-800">{entry.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {entry.assignedTo?.name ?? <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {entry.targetReviewDate
                          ? new Date(entry.targetReviewDate).toLocaleDateString('en-SA-u-ca-gregory')
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge s={entry.status} />
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => openView(entry)}>
                            <Eye className="h-3 w-3" /> View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-[#2c3e50]" />
              New OFI / Observation
            </DialogTitle>
            <p className="text-xs text-slate-400 font-mono mt-0.5">HEXA-FRM-024 · Hexa-ISP-004</p>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Finding Type</Label>
                <Select value={form.findingType} onValueChange={v => setForm(f => ({ ...f, findingType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFI">OFI</SelectItem>
                    <SelectItem value="Observation">Observation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Process Area</Label>
                <Select value={form.processArea} onValueChange={v => setForm(f => ({ ...f, processArea: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROCESS_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe the opportunity or observation…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Potential Benefit</Label>
              <Textarea
                rows={2}
                value={form.potentialBenefit}
                onChange={e => setForm(f => ({ ...f, potentialBenefit: e.target.value }))}
                placeholder="What benefit could this bring if adopted?"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assigned To</Label>
                <Select value={form.assignedToId || '__none__'} onValueChange={v => setForm(f => ({ ...f, assignedToId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Review Date</Label>
                <Input
                  type="date"
                  value={form.targetReviewDate}
                  onChange={e => setForm(f => ({ ...f, targetReviewDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Source Audit # (optional)</Label>
              <Input
                value={form.auditNumber}
                onChange={e => setForm(f => ({ ...f, auditNumber: e.target.value }))}
                placeholder="e.g. AUD-2026-001"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes…"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={createEntry}
              disabled={saving || !form.description}
              className="bg-[#2c3e50] hover:bg-[#34495e]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-[#2c3e50]" />
                      {selected.findingNumber}
                    </DialogTitle>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">HEXA-FRM-024 · Hexa-ISP-004</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs shrink-0"
                    onClick={fetchData}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </Button>
                </div>
                <div className="rounded-lg bg-[#2c3e50]/5 border border-[#2c3e50]/10 p-3 mt-2">
                  <div className="flex gap-2 flex-wrap mb-1">
                    <TypeBadge t={selected.findingType} />
                    <StatusBadge s={selected.status} />
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{selected.processArea}</span>
                    {selected.auditNumber && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{selected.auditNumber}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{selected.description}</p>
                </div>
              </DialogHeader>

              <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1 py-1">
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OFI_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Finding Type</Label>
                    <Select value={editForm.findingType} onValueChange={v => setEditForm(f => ({ ...f, findingType: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OFI">OFI</SelectItem>
                        <SelectItem value="Observation">Observation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Process Area</Label>
                    <Select value={editForm.processArea} onValueChange={v => setEditForm(f => ({ ...f, processArea: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROCESS_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Potential Benefit</Label>
                  <Textarea
                    rows={2}
                    value={editForm.potentialBenefit}
                    onChange={e => setEditForm(f => ({ ...f, potentialBenefit: e.target.value }))}
                    placeholder="What benefit could this bring if adopted?"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Assigned To</Label>
                    <Select value={editForm.assignedToId || '__none__'} onValueChange={v => setEditForm(f => ({ ...f, assignedToId: v === '__none__' ? '' : v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target Review Date</Label>
                    <Input
                      type="date"
                      value={editForm.targetReviewDate}
                      onChange={e => setEditForm(f => ({ ...f, targetReviewDate: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Source Audit # (optional)</Label>
                  <Input
                    value={editForm.auditNumber}
                    onChange={e => setEditForm(f => ({ ...f, auditNumber: e.target.value }))}
                    placeholder="e.g. AUD-2026-001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Additional notes…"
                    className="mt-1"
                  />
                </div>
                <div className="rounded-lg bg-slate-50 border p-3 text-xs text-slate-500">
                  <p>Created: {new Date(selected.createdAt).toLocaleString('en-SA-u-ca-gregory')}</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialog(false)}>Cancel</Button>
                <Button onClick={updateEntry} disabled={updating} className="bg-[#2c3e50] hover:bg-[#34495e]">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Edit2 className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
