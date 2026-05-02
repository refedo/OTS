'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardCheck, Plus, RefreshCw, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react';

type Project = { id: string; projectNumber: string; name: string };
type Checklist = {
  id: string;
  meetingDate: string | null;
  location: string | null;
  attendees: string | null;
  agendaItems: string | null;
  deliverablesDiscussed: string | null;
  openItems: string | null;
  nextSteps: string | null;
  status: string;
  signedOffAt: string | null;
  notes: string | null;
  createdAt: string;
  project: { id: string; projectNumber: string; name: string } | null;
  facilitatedBy: { id: string; name: string } | null;
  signedOffBy: { id: string; name: string } | null;
};

const STATUS_CFG: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  SIGNED_OFF: 'bg-green-100 text-green-700',
};

const EMPTY_FORM = {
  projectId: '',
  meetingDate: '',
  location: '',
  attendees: '',
  agendaItems: '',
  deliverablesDiscussed: '',
  openItems: '',
  nextSteps: '',
  status: 'DRAFT',
  notes: '',
};

export function KickoffChecklistsClient() {
  const [records, setRecords] = useState<Checklist[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Checklist | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const [rRes, pRes] = await Promise.all([
      fetch(`/api/projects/kickoff${params}`),
      fetch('/api/projects?status=ACTIVE&limit=200'),
    ]);
    if (rRes.ok) setRecords(await rRes.json());
    if (pRes.ok) {
      const data = await pRes.json();
      setProjects(Array.isArray(data) ? data : (data.projects ?? []));
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpi = {
    total: records.length,
    draft: records.filter(r => r.status === 'DRAFT').length,
    signedOff: records.filter(r => r.status === 'SIGNED_OFF').length,
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  }

  function openEdit(r: Checklist) {
    setEditing(r);
    setForm({
      projectId: r.project?.id ?? '',
      meetingDate: r.meetingDate ? r.meetingDate.slice(0, 16) : '',
      location: r.location ?? '',
      attendees: r.attendees ?? '',
      agendaItems: r.agendaItems ?? '',
      deliverablesDiscussed: r.deliverablesDiscussed ?? '',
      openItems: r.openItems ?? '',
      nextSteps: r.nextSteps ?? '',
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
        projectId: form.projectId || undefined,
        meetingDate: form.meetingDate ? new Date(form.meetingDate).toISOString() : null,
      };
      const url = editing ? `/api/projects/kickoff/${editing.id}` : '/api/projects/kickoff';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchData(); }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this kickoff checklist?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/projects/kickoff/${id}`, { method: 'DELETE' });
      fetchData();
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
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Kickoff Meeting Checklists</h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">HEXA-FRM-016</span>
          </div>
          <p className="text-sm text-slate-500">ISO 9001:2015 §8.1, §8.2.3 — Operational planning and project kickoff documentation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New Checklist</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: kpi.total, color: 'text-slate-700', icon: <ClipboardCheck className="h-4 w-4 text-slate-400" /> },
          { label: 'Draft', value: kpi.draft, color: 'text-amber-700', icon: <Clock className="h-4 w-4 text-amber-400" /> },
          { label: 'Signed Off', value: kpi.signedOff, color: 'text-green-700', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
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
        {['', 'DRAFT', 'SIGNED_OFF'].map(s => (
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
            <div className="py-12 text-center text-slate-400 text-sm">No kickoff checklists yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Project', 'Meeting Date', 'Location', 'Facilitated By', 'Status', 'Signed Off', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {r.project ? (
                          <div>
                            <span className="font-medium text-slate-900">{r.project.projectNumber}</span>
                            <span className="text-slate-500 text-xs ml-1">— {r.project.name}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.meetingDate ? new Date(r.meetingDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.location ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.facilitatedBy?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_CFG[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.signedOffAt ? new Date(r.signedOffAt).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
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
            <DialogTitle>{editing ? 'Edit Kickoff Checklist' : 'New Kickoff Meeting Checklist'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Project {!editing && '*'}</Label>
              <Select value={form.projectId} onValueChange={v => f('projectId', v)}>
                <SelectTrigger><SelectValue placeholder="Select project…" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.projectNumber} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Meeting Date</Label>
              <Input type="datetime-local" value={form.meetingDate} onChange={e => f('meetingDate', e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Conference Room A" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => f('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SIGNED_OFF">Signed Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Attendees</Label>
              <Textarea value={form.attendees} onChange={e => f('attendees', e.target.value)} rows={2} placeholder="List of attendees and roles…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Agenda Items</Label>
              <Textarea value={form.agendaItems} onChange={e => f('agendaItems', e.target.value)} rows={3} placeholder="Meeting agenda topics…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Deliverables Discussed</Label>
              <Textarea value={form.deliverablesDiscussed} onChange={e => f('deliverablesDiscussed', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Open Items / Action Points</Label>
              <Textarea value={form.openItems} onChange={e => f('openItems', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Next Steps</Label>
              <Textarea value={form.nextSteps} onChange={e => f('nextSteps', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || (!editing && !form.projectId)}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
