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
import { AlertOctagon, Plus, RefreshCw, Pencil, Trash2, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

type Incident = {
  id: string;
  incidentNumber: string;
  title: string;
  incidentType: string;
  incidentDate: string | null;
  location: string | null;
  severity: string;
  status: string;
  description: string | null;
  immediateAction: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  closedAt: string | null;
  notes: string | null;
  createdAt: string;
  reportedBy: { id: string; name: string } | null;
};

const SEVERITY_CFG: Record<string, string> = {
  LOW: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const STATUS_CFG: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  UNDER_INVESTIGATION: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-green-100 text-green-700',
};

const TYPE_LABELS: Record<string, string> = {
  INCIDENT: 'Incident',
  NEAR_MISS: 'Near-Miss',
  FIRST_AID: 'First Aid',
  DANGEROUS_OCCURRENCE: 'Dangerous Occurrence',
};

const EMPTY_FORM = {
  title: '',
  incidentType: 'INCIDENT',
  incidentDate: '',
  location: '',
  description: '',
  immediateAction: '',
  rootCause: '',
  correctiveAction: '',
  preventiveAction: '',
  severity: 'MEDIUM',
  status: 'OPEN',
  notes: '',
};

export function IncidentsClient() {
  const [records, setRecords] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const res = await fetch(`/api/ims/safety/incidents${params}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const kpi = {
    total: records.length,
    open: records.filter(r => r.status === 'OPEN').length,
    investigating: records.filter(r => r.status === 'UNDER_INVESTIGATION').length,
    closed: records.filter(r => r.status === 'CLOSED').length,
    critical: records.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length,
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  }

  function openEdit(r: Incident) {
    setEditing(r);
    setForm({
      title: r.title,
      incidentType: r.incidentType,
      incidentDate: r.incidentDate ? r.incidentDate.slice(0, 16) : '',
      location: r.location ?? '',
      description: r.description ?? '',
      immediateAction: r.immediateAction ?? '',
      rootCause: r.rootCause ?? '',
      correctiveAction: r.correctiveAction ?? '',
      preventiveAction: r.preventiveAction ?? '',
      severity: r.severity,
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
        incidentDate: form.incidentDate ? new Date(form.incidentDate).toISOString() : null,
      };
      const url = editing ? `/api/ims/safety/incidents/${editing.id}` : '/api/ims/safety/incidents';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchRecords(); }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this incident record?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/ims/safety/incidents/${id}`, { method: 'DELETE' });
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
            <AlertOctagon className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900">Incidents / Near-Miss</h1>
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">HEXA-FRM-019</span>
          </div>
          <p className="text-sm text-slate-500">ISO 45001:2018 §10.2.1 — Incident reporting, investigation and corrective action · Procedure: Hexa-ISP-020</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecords}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Report Incident</Button>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-safety-incidents"
        clauses={[{ standard: 'ISO 45001', clause: '§10.2.1', title: 'Incident reporting and corrective action' }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: kpi.total, icon: <AlertOctagon className="h-4 w-4 text-slate-500" />, color: 'text-slate-700' },
          { label: 'Open', value: kpi.open, icon: <Clock className="h-4 w-4 text-blue-500" />, color: 'text-blue-700' },
          { label: 'Investigating', value: kpi.investigating, icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, color: 'text-amber-700' },
          { label: 'Closed', value: kpi.closed, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, color: 'text-green-700' },
          { label: 'High/Critical', value: kpi.critical, icon: <ShieldAlert className="h-4 w-4 text-red-500" />, color: 'text-red-700' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">{k.icon}<span className="text-xs text-slate-500">{k.label}</span></div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 flex-wrap">
        {['', 'OPEN', 'UNDER_INVESTIGATION', 'CLOSED'].map(s => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No incidents recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Number', 'Title', 'Type', 'Date', 'Location', 'Severity', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.incidentNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{r.title}</td>
                      <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[r.incidentType] ?? r.incidentType}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.incidentDate ? new Date(r.incidentDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SEVERITY_CFG[r.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_CFG[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status.replace('_', ' ')}
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
            <DialogTitle>{editing ? 'Edit Incident' : 'Report Incident / Near-Miss'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => f('title', e.target.value)} placeholder="Brief incident title" />
            </div>
            <div>
              <Label>Incident Type</Label>
              <Select value={form.incidentType} onValueChange={v => f('incidentType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCIDENT">Incident</SelectItem>
                  <SelectItem value="NEAR_MISS">Near-Miss</SelectItem>
                  <SelectItem value="FIRST_AID">First Aid</SelectItem>
                  <SelectItem value="DANGEROUS_OCCURRENCE">Dangerous Occurrence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => f('severity', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Incident Date</Label>
              <Input type="datetime-local" value={form.incidentDate} onChange={e => f('incidentDate', e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Fabrication Bay 3" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => f('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="UNDER_INVESTIGATION">Under Investigation</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => f('description', e.target.value)} rows={3} placeholder="Describe what happened…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Immediate Action Taken</Label>
              <Textarea value={form.immediateAction} onChange={e => f('immediateAction', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Root Cause</Label>
              <Textarea value={form.rootCause} onChange={e => f('rootCause', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Corrective Action</Label>
              <Textarea value={form.correctiveAction} onChange={e => f('correctiveAction', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Preventive Action</Label>
              <Textarea value={form.preventiveAction} onChange={e => f('preventiveAction', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
