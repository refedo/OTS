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
import { HardHat, Plus, RefreshCw, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react';

type Talk = {
  id: string;
  talkNumber: string;
  topic: string;
  conductedDate: string | null;
  location: string | null;
  attendeeCount: number | null;
  durationMinutes: number | null;
  content: string | null;
  followUpActions: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  conductedBy: { id: string; name: string } | null;
};

const STATUS_CFG: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const EMPTY_FORM = {
  topic: '',
  conductedDate: '',
  location: '',
  attendeeCount: '',
  durationMinutes: '',
  content: '',
  followUpActions: '',
  status: 'PLANNED',
  notes: '',
};

export function ToolboxTalksClient() {
  const [records, setRecords] = useState<Talk[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Talk | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = filterStatus ? `?status=${filterStatus}` : '';
    const res = await fetch(`/api/ims/safety/toolbox-talks${params}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const kpi = {
    total: records.length,
    planned: records.filter(r => r.status === 'PLANNED').length,
    completed: records.filter(r => r.status === 'COMPLETED').length,
    totalAttendees: records.reduce((sum, r) => sum + (r.attendeeCount ?? 0), 0),
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  }

  function openEdit(r: Talk) {
    setEditing(r);
    setForm({
      topic: r.topic,
      conductedDate: r.conductedDate ? r.conductedDate.slice(0, 10) : '',
      location: r.location ?? '',
      attendeeCount: r.attendeeCount != null ? String(r.attendeeCount) : '',
      durationMinutes: r.durationMinutes != null ? String(r.durationMinutes) : '',
      content: r.content ?? '',
      followUpActions: r.followUpActions ?? '',
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
        conductedDate: form.conductedDate ? new Date(form.conductedDate).toISOString() : null,
        attendeeCount: form.attendeeCount ? parseInt(form.attendeeCount) : null,
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null,
      };
      const url = editing ? `/api/ims/safety/toolbox-talks/${editing.id}` : '/api/ims/safety/toolbox-talks';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchRecords(); }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this toolbox talk?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/ims/safety/toolbox-talks/${id}`, { method: 'DELETE' });
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
            <HardHat className="h-6 w-6 text-yellow-600" />
            <h1 className="text-2xl font-bold text-slate-900">Toolbox Talks</h1>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-medium">HEXA-FRM-026</span>
          </div>
          <p className="text-sm text-slate-500">ISO 45001:2018 §7.3 — Safety awareness and communication sessions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecords}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Talk</Button>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-safety-toolbox-talks"
        clauses={[{ standard: 'ISO 45001', clause: '§7.3', title: 'Awareness and safety communication' }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Talks', value: kpi.total, color: 'text-slate-700', icon: <HardHat className="h-4 w-4 text-slate-400" /> },
          { label: 'Planned', value: kpi.planned, color: 'text-blue-700', icon: <Clock className="h-4 w-4 text-blue-400" /> },
          { label: 'Completed', value: kpi.completed, color: 'text-green-700', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
          { label: 'Total Attendees', value: kpi.totalAttendees, color: 'text-indigo-700', icon: <HardHat className="h-4 w-4 text-indigo-400" /> },
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
        {['', 'PLANNED', 'COMPLETED'].map(s => (
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
            <div className="py-12 text-center text-slate-400 text-sm">No toolbox talks recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Number', 'Topic', 'Date', 'Location', 'Attendees', 'Duration (min)', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.talkNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{r.topic}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.conductedDate ? new Date(r.conductedDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.location ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.attendeeCount ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.durationMinutes ?? '—'}</td>
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
            <DialogTitle>{editing ? 'Edit Toolbox Talk' : 'Add Toolbox Talk'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Topic *</Label>
              <Input value={form.topic} onChange={e => f('topic', e.target.value)} placeholder="e.g. Manual Handling Safety" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => f('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conducted Date</Label>
              <Input type="date" value={form.conductedDate} onChange={e => f('conductedDate', e.target.value)} />
            </div>
            <div>
              <Label>Location</Label>
              <Input value={form.location} onChange={e => f('location', e.target.value)} placeholder="e.g. Workshop Floor" />
            </div>
            <div>
              <Label>Attendee Count</Label>
              <Input type="number" value={form.attendeeCount} onChange={e => f('attendeeCount', e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={form.durationMinutes} onChange={e => f('durationMinutes', e.target.value)} placeholder="30" />
            </div>
            <div className="sm:col-span-2">
              <Label>Content / Key Points</Label>
              <Textarea value={form.content} onChange={e => f('content', e.target.value)} rows={3} placeholder="Topics covered…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Follow-Up Actions</Label>
              <Textarea value={form.followUpActions} onChange={e => f('followUpActions', e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.topic.trim()}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
