'use client';

import { useState, useEffect, useCallback } from 'react';
import { IsoClauseNote } from '@/components/ims/IsoClauseNote';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Siren, Plus, RefreshCw, Pencil, Trash2, CheckCircle2, Clock, XCircle } from 'lucide-react';

type Drill = {
  id: string;
  drillNumber: string;
  drillType: string;
  scheduledDate: string | null;
  conductedDate: string | null;
  location: string | null;
  participantCount: number | null;
  objectives: string | null;
  findings: string | null;
  correctiveActions: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  conductedBy: { id: string; name: string } | null;
};

const STATUS_CFG: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

const DRILL_TYPE_LABELS: Record<string, string> = {
  FIRE_EVACUATION: 'Fire Evacuation',
  FIRST_AID: 'First Aid',
  CHEMICAL_SPILL: 'Chemical Spill',
  GENERAL: 'General',
  OTHER: 'Other',
};

const EMPTY_FORM = {
  drillType: 'FIRE_EVACUATION',
  scheduledDate: '',
  conductedDate: '',
  location: '',
  participantCount: '',
  objectives: '',
  findings: '',
  correctiveActions: '',
  status: 'PLANNED',
  notes: '',
};

export function DrillsClient() {
  const [records, setRecords] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Drill | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const res = await fetch(`/api/ims/safety/drills${params}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const kpi = {
    total: records.length,
    planned: records.filter(r => r.status === 'PLANNED').length,
    completed: records.filter(r => r.status === 'COMPLETED').length,
    cancelled: records.filter(r => r.status === 'CANCELLED').length,
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  }

  function openEdit(r: Drill) {
    setEditing(r);
    setForm({
      drillType: r.drillType,
      scheduledDate: r.scheduledDate ? r.scheduledDate.slice(0, 10) : '',
      conductedDate: r.conductedDate ? r.conductedDate.slice(0, 10) : '',
      location: r.location ?? '',
      participantCount: r.participantCount != null ? String(r.participantCount) : '',
      objectives: r.objectives ?? '',
      findings: r.findings ?? '',
      correctiveActions: r.correctiveActions ?? '',
      status: r.status,
      notes: r.notes ?? '',
    });
    setDialog(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : null,
        conductedDate: form.conductedDate ? new Date(form.conductedDate).toISOString() : null,
        participantCount: form.participantCount ? parseInt(form.participantCount) : null,
      };
      const url = editing ? `/api/ims/safety/drills/${editing.id}` : '/api/ims/safety/drills';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchRecords(); }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this drill record?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/ims/safety/drills/${id}`, { method: 'DELETE' });
      fetchRecords();
    } finally {
      setDeleting(null);
    }
  }

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Siren className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-slate-900">Emergency Drills</h1>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">HEXA-FRM-025</span>
          </div>
          <p className="text-sm text-slate-500">ISO 45001:2018 §8.8 — Emergency preparedness and response exercises</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecords}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Drill</Button>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-safety-drills"
        clauses={[{ standard: 'ISO 45001', clause: '§8.8', title: 'Emergency preparedness and response' }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: kpi.total, color: 'text-slate-700' },
          { label: 'Planned', value: kpi.planned, color: 'text-blue-700', icon: <Clock className="h-4 w-4 text-blue-400" /> },
          { label: 'Completed', value: kpi.completed, color: 'text-green-700', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
          { label: 'Cancelled', value: kpi.cancelled, color: 'text-slate-500', icon: <XCircle className="h-4 w-4 text-slate-400" /> },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">
                {k.icon ?? <Siren className="h-4 w-4 text-slate-400" />}
                <span className="text-xs text-slate-500">{k.label}</span>
              </div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        {['', 'PLANNED', 'COMPLETED', 'CANCELLED'].map(s => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)}>
            {s === '' ? 'All' : s}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No drills recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Number', 'Type', 'Scheduled', 'Conducted', 'Location', 'Participants', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.drillNumber}</td>
                      <td className="px-4 py-3 text-slate-700">{DRILL_TYPE_LABELS[r.drillType] ?? r.drillType}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.conductedDate ? new Date(r.conductedDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.location ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.participantCount ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_CFG[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteRecord(r.id)} disabled={deleting === r.id}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Drill Record' : 'Add Emergency Drill'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div>
              <Label>Drill Type *</Label>
              <Select value={form.drillType} onValueChange={v => f('drillType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIRE_EVACUATION">Fire Evacuation</SelectItem>
                  <SelectItem value="FIRST_AID">First Aid</SelectItem>
                  <SelectItem value="CHEMICAL_SPILL">Chemical Spill</SelectItem>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => f('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input type="date" value={form.scheduledDate} onChange={e => f('scheduledDate', e.target.value)} />
            </div>
            <div>
              <Label>Conducted Date</Label>
              <Input type="date" value={form.conductedDate} onChange={e => f('conductedDate', e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Main Assembly Hall" />
            </div>
            <div>
              <Label>Participants</Label>
              <Input type="number" value={form.participantCount} onChange={e => f('participantCount', e.target.value)} placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <Label>Objectives</Label>
              <Textarea value={form.objectives} onChange={e => f('objectives', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Findings</Label>
              <Textarea value={form.findings} onChange={e => f('findings', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Corrective Actions</Label>
              <Textarea value={form.correctiveActions} onChange={e => f('correctiveActions', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
