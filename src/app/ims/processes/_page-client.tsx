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
import { Workflow, Plus, RefreshCw, Pencil, Trash2, CheckCircle2, RotateCcw, Archive, FileDown, Loader2 } from 'lucide-react';
import { generateProcessesPDF, type ProcessPDFData } from '@/lib/ims-pdf-generator';

type Process = {
  id: string;
  processNumber: string;
  name: string;
  processOwner: string | null;
  processType: string;
  inputs: string | null;
  outputs: string | null;
  kpis: string | null;
  isoClause: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  owner: { id: string; name: string } | null;
};

const STATUS_CFG: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  OBSOLETE: 'bg-slate-100 text-slate-500',
};

const TYPE_CFG: Record<string, string> = {
  CORE: 'bg-blue-100 text-blue-700',
  SUPPORT: 'bg-indigo-100 text-indigo-700',
  OUTSOURCED: 'bg-orange-100 text-orange-700',
  IN_HOUSE: 'bg-teal-100 text-teal-700',
};

const EMPTY_FORM = {
  name: '',
  processOwner: '',
  processType: 'CORE',
  inputs: '',
  outputs: '',
  kpis: '',
  isoClause: '',
  status: 'ACTIVE',
  notes: '',
};

export function QmsProcessesClient() {
  const [records, setRecords] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Process | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterType, setFilterType] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = filterType ? `?processType=${filterType}` : '';
    const res = await fetch(`/api/ims/qms-processes${params}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [filterType]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const kpi = {
    total: records.length,
    active: records.filter(r => r.status === 'ACTIVE').length,
    underReview: records.filter(r => r.status === 'UNDER_REVIEW').length,
    outsourced: records.filter(r => r.processType === 'OUTSOURCED').length,
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  }

  function openEdit(r: Process) {
    setEditing(r);
    setForm({
      name: r.name,
      processOwner: r.processOwner ?? '',
      processType: r.processType,
      inputs: r.inputs ?? '',
      outputs: r.outputs ?? '',
      kpis: r.kpis ?? '',
      isoClause: r.isoClause ?? '',
      status: r.status,
      notes: r.notes ?? '',
    });
    setDialog(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form };
      const url = editing ? `/api/ims/qms-processes/${editing.id}` : '/api/ims/qms-processes';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchRecords(); }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this process?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/ims/qms-processes/${id}`, { method: 'DELETE' });
      fetchRecords();
    } finally {
      setDeleting(null);
    }
  }

  async function approveProcess(id: string) {
    await fetch(`/api/ims/qms-processes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    fetchRecords();
  }

  const f = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const pdfData: ProcessPDFData[] = records.map(r => ({
        processNumber: r.processNumber,
        name: r.name,
        processOwner: r.owner?.name ?? r.processOwner,
        processType: r.processType,
        inputs: r.inputs,
        outputs: r.outputs,
        kpis: r.kpis,
        isoClause: r.isoClause,
        status: r.status,
      }));
      await generateProcessesPDF(pdfData);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Workflow className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-2xl font-bold tracking-tight">QMS Process List</h1>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">HEXA-REC-024</span>
              </div>
              <p className="text-slate-300 text-sm">ISO 9001:2015 §4.4 — Quality Management System and its processes · Procedure: Hexa-ISP-001</p>
              <p className="text-slate-400/70 text-xs font-mono mt-1">System-generated on demand · SIPOC register · ISO §4.4</p>
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            className="border-white/30 text-white hover:bg-white hover:text-[#2c3e50] transition-colors gap-1.5 shrink-0"
            onClick={downloadPDF}
            disabled={downloading}
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            Download PDF
          </Button>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-qms-processes"
        clauses={[
          { standard: 'ISO 9001', clause: '§4.4', title: 'Quality management system and its processes' },
          { standard: 'ISO 14001', clause: '§4.4', title: 'Environmental management system' },
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Processes', value: kpi.total, color: 'text-[#2c3e50]', bg: 'bg-white border border-slate-200', icon: '⚙️' },
          { label: 'Active', value: kpi.active, color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-200', icon: '✅' },
          { label: 'Under Review', value: kpi.underReview, color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-200', icon: '🔄' },
          { label: 'Outsourced', value: kpi.outsourced, color: 'text-orange-600', bg: 'bg-orange-50 border border-orange-200', icon: '🔗' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg} hover:shadow-sm transition-shadow`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <span className="text-base">{k.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {['', 'CORE', 'SUPPORT', 'OUTSOURCED', 'IN_HOUSE'].map(t => (
            <Button
              key={t}
              variant={filterType === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(t)}
              className={filterType === t ? 'text-white' : ''}
              style={filterType === t ? { backgroundColor: '#2c3e50' } : {}}
            >
              {t === '' ? 'All' : t.replace('_', ' ')}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecords} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}>
            <Plus className="h-4 w-4" /> Add Process
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No processes defined yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Number', 'Process Name', 'Owner', 'Type', 'ISO Clause', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.processNumber}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.owner?.name ?? r.processOwner ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_CFG[r.processType] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.processType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{r.isoClause ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_CFG[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {r.status === 'UNDER_REVIEW' && (
                            <Button variant="ghost" size="sm" onClick={() => approveProcess(r.id)} title="Approve — set to Active" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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
            <DialogTitle>{editing ? 'Edit Process' : 'Add QMS Process'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Process Name *</Label>
              <Input value={form.name} onChange={e => f('name', e.target.value)} placeholder="e.g. Welding Process Control" />
            </div>
            <div>
              <Label>Process Owner (name/role)</Label>
              <Input value={form.processOwner} onChange={e => f('processOwner', e.target.value)} placeholder="e.g. QC Manager" />
            </div>
            <div>
              <Label>Process Type</Label>
              <Select value={form.processType} onValueChange={v => f('processType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORE">Core</SelectItem>
                  <SelectItem value="SUPPORT">Support</SelectItem>
                  <SelectItem value="OUTSOURCED">Outsourced</SelectItem>
                  <SelectItem value="IN_HOUSE">In-House</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ISO Clause Reference</Label>
              <Input value={form.isoClause} onChange={e => f('isoClause', e.target.value)} placeholder="e.g. ISO 9001 §8.5.1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => f('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="OBSOLETE">Obsolete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Inputs</Label>
              <Textarea value={form.inputs} onChange={e => f('inputs', e.target.value)} rows={2} placeholder="What goes into this process…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Outputs</Label>
              <Textarea value={form.outputs} onChange={e => f('outputs', e.target.value)} rows={2} placeholder="What this process produces…" />
            </div>
            <div className="sm:col-span-2">
              <Label>KPIs / Performance Indicators</Label>
              <Textarea value={form.kpis} onChange={e => f('kpis', e.target.value)} rows={2} placeholder="How performance is measured…" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
