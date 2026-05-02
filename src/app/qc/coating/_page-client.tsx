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
import { Layers, Plus, RefreshCw, Pencil, Trash2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

type CoatingRecord = {
  id: string;
  inspectionNumber: string;
  coatingSystem: string;
  coatLayer: string;
  surfacePrep: string | null;
  nominalDft: number | null;
  minDft: number | null;
  maxDft: number | null;
  averageDft: number | null;
  result: string | null;
  inspectionDate: string | null;
  witnessedBy: string | null;
  remarks: string | null;
  createdAt: string;
  project: { id: string; projectNumber: string; name: string } | null;
  inspector: { id: string; name: string } | null;
};

const RESULT_CFG: Record<string, string> = {
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONDITIONAL: 'bg-amber-100 text-amber-700',
};

const LAYER_LABELS: Record<string, string> = {
  PRIMER: 'Primer',
  MID_COAT: 'Mid Coat',
  TOP_COAT: 'Top Coat',
  SINGLE: 'Single Coat',
};

const EMPTY_FORM = {
  coatingSystem: '',
  coatLayer: 'PRIMER',
  surfacePrep: '',
  ambientTemp: '',
  relativeHumidity: '',
  dewPoint: '',
  nominalDft: '',
  minDft: '',
  maxDft: '',
  averageDft: '',
  result: 'ACCEPTED',
  inspectionDate: '',
  witnessedBy: '',
  remarks: '',
};

export function CoatingInspectionClient() {
  const [records, setRecords] = useState<CoatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<CoatingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterResult, setFilterResult] = useState('');
  const [filterLayer, setFilterLayer] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterResult) p.set('result', filterResult);
    if (filterLayer) p.set('coatLayer', filterLayer);
    const res = await fetch(`/api/qc/coating${p.toString() ? '?' + p.toString() : ''}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [filterResult, filterLayer]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const kpi = {
    total: records.length,
    accepted: records.filter(r => r.result === 'ACCEPTED').length,
    rejected: records.filter(r => r.result === 'REJECTED').length,
    conditional: records.filter(r => r.result === 'CONDITIONAL').length,
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  }

  function openEdit(r: CoatingRecord) {
    setEditing(r);
    setForm({
      coatingSystem: r.coatingSystem,
      coatLayer: r.coatLayer,
      surfacePrep: r.surfacePrep ?? '',
      ambientTemp: '',
      relativeHumidity: '',
      dewPoint: '',
      nominalDft: r.nominalDft != null ? String(r.nominalDft) : '',
      minDft: r.minDft != null ? String(r.minDft) : '',
      maxDft: r.maxDft != null ? String(r.maxDft) : '',
      averageDft: r.averageDft != null ? String(r.averageDft) : '',
      result: r.result ?? 'ACCEPTED',
      inspectionDate: r.inspectionDate ? r.inspectionDate.slice(0, 10) : '',
      witnessedBy: r.witnessedBy ?? '',
      remarks: r.remarks ?? '',
    });
    setDialog(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        inspectionDate: form.inspectionDate ? new Date(form.inspectionDate).toISOString() : null,
        ambientTemp: form.ambientTemp ? parseFloat(form.ambientTemp) : null,
        relativeHumidity: form.relativeHumidity ? parseFloat(form.relativeHumidity) : null,
        dewPoint: form.dewPoint ? parseFloat(form.dewPoint) : null,
        nominalDft: form.nominalDft ? parseInt(form.nominalDft) : null,
        minDft: form.minDft ? parseInt(form.minDft) : null,
        maxDft: form.maxDft ? parseInt(form.maxDft) : null,
        averageDft: form.averageDft ? parseFloat(form.averageDft) : null,
      };
      const url = editing ? `/api/qc/coating/${editing.id}` : '/api/qc/coating';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchRecords(); }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this coating inspection record?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/qc/coating/${id}`, { method: 'DELETE' });
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
            <Layers className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Coating Inspection — DFT</h1>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">HEXA-FRM-022</span>
          </div>
          <p className="text-sm text-slate-500">ISO 9001:2015 §8.5.1 — Dry Film Thickness inspection and coating quality records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecords}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Record</Button>
        </div>
      </div>

      <IsoClauseNote
        storageKey="qc-coating-inspection"
        clauses={[{ standard: 'ISO 9001', clause: '§8.5.1', title: 'Control of production and service provision' }]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: kpi.total, color: 'text-slate-700', icon: <Layers className="h-4 w-4 text-slate-400" /> },
          { label: 'Accepted', value: kpi.accepted, color: 'text-green-700', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
          { label: 'Conditional', value: kpi.conditional, color: 'text-amber-700', icon: <AlertTriangle className="h-4 w-4 text-amber-400" /> },
          { label: 'Rejected', value: kpi.rejected, color: 'text-red-700', icon: <XCircle className="h-4 w-4 text-red-400" /> },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-1">{k.icon}<span className="text-xs text-slate-500">{k.label}</span></div>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <span className="text-sm text-slate-500">Result:</span>
        {['', 'ACCEPTED', 'CONDITIONAL', 'REJECTED'].map(r => (
          <Button key={r} variant={filterResult === r ? 'default' : 'outline'} size="sm" onClick={() => setFilterResult(r)}>
            {r === '' ? 'All' : r}
          </Button>
        ))}
        <span className="text-sm text-slate-500 ml-4">Layer:</span>
        {['', 'PRIMER', 'MID_COAT', 'TOP_COAT', 'SINGLE'].map(l => (
          <Button key={l} variant={filterLayer === l ? 'default' : 'outline'} size="sm" onClick={() => setFilterLayer(l)}>
            {l === '' ? 'All' : l.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No coating inspection records.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Insp. No.', 'Project', 'Coating System', 'Layer', 'Nominal DFT (μm)', 'Avg DFT (μm)', 'Date', 'Result', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.inspectionNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{r.project ? r.project.projectNumber : '—'}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium max-w-[150px] truncate">{r.coatingSystem}</td>
                      <td className="px-4 py-3 text-slate-600">{LAYER_LABELS[r.coatLayer] ?? r.coatLayer}</td>
                      <td className="px-4 py-3 text-slate-600">{r.nominalDft ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{r.averageDft ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {r.inspectionDate ? new Date(r.inspectionDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {r.result ? (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${RESULT_CFG[r.result] ?? 'bg-gray-100 text-gray-600'}`}>
                            {r.result}
                          </span>
                        ) : '—'}
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
            <DialogTitle>{editing ? 'Edit Coating Inspection' : 'New Coating Inspection Record'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Coating System *</Label>
              <Input value={form.coatingSystem} onChange={e => f('coatingSystem', e.target.value)} placeholder="e.g. Jotun Barrier 80 / Hardtop AX" />
            </div>
            <div>
              <Label>Coat Layer</Label>
              <Select value={form.coatLayer} onValueChange={v => f('coatLayer', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIMER">Primer</SelectItem>
                  <SelectItem value="MID_COAT">Mid Coat</SelectItem>
                  <SelectItem value="TOP_COAT">Top Coat</SelectItem>
                  <SelectItem value="SINGLE">Single Coat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Result</Label>
              <Select value={form.result} onValueChange={v => f('result', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Surface Preparation</Label>
              <Input value={form.surfacePrep} onChange={e => f('surfacePrep', e.target.value)} placeholder="e.g. Sa 2.5" />
            </div>
            <div>
              <Label>Inspection Date</Label>
              <Input type="date" value={form.inspectionDate} onChange={e => f('inspectionDate', e.target.value)} />
            </div>
            <div>
              <Label>Ambient Temp (°C)</Label>
              <Input type="number" value={form.ambientTemp} onChange={e => f('ambientTemp', e.target.value)} placeholder="25" />
            </div>
            <div>
              <Label>Relative Humidity (%)</Label>
              <Input type="number" value={form.relativeHumidity} onChange={e => f('relativeHumidity', e.target.value)} placeholder="60" />
            </div>
            <div>
              <Label>Dew Point (°C)</Label>
              <Input type="number" value={form.dewPoint} onChange={e => f('dewPoint', e.target.value)} placeholder="10" />
            </div>
            <div>
              <Label>Nominal DFT (μm)</Label>
              <Input type="number" value={form.nominalDft} onChange={e => f('nominalDft', e.target.value)} placeholder="200" />
            </div>
            <div>
              <Label>Min DFT (μm)</Label>
              <Input type="number" value={form.minDft} onChange={e => f('minDft', e.target.value)} placeholder="160" />
            </div>
            <div>
              <Label>Max DFT (μm)</Label>
              <Input type="number" value={form.maxDft} onChange={e => f('maxDft', e.target.value)} placeholder="300" />
            </div>
            <div>
              <Label>Average DFT (μm)</Label>
              <Input type="number" value={form.averageDft} onChange={e => f('averageDft', e.target.value)} placeholder="220" />
            </div>
            <div>
              <Label>Witnessed By</Label>
              <Input value={form.witnessedBy} onChange={e => f('witnessedBy', e.target.value)} placeholder="Client rep / Third party" />
            </div>
            <div className="sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={e => f('remarks', e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.coatingSystem.trim()}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
