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
import { Award, Plus, RefreshCw, Pencil, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';

type WQT = {
  id: string;
  wqtNumber: string;
  welderName: string;
  welderCode: string | null;
  weldingProcess: string;
  position: string | null;
  baseMaterial: string | null;
  fillMaterial: string | null;
  thickness: string | null;
  diameter: string | null;
  testDate: string | null;
  testLocation: string | null;
  visualResult: string | null;
  bendTestResult: string | null;
  radiographyResult: string | null;
  overallResult: string;
  certificationNumber: string | null;
  validFrom: string | null;
  expiryDate: string | null;
  renewalDate: string | null;
  notes: string | null;
  createdAt: string;
  inspector: { id: string; name: string } | null;
};

const RESULT_CFG: Record<string, string> = {
  QUALIFIED: 'bg-green-100 text-green-700',
  NOT_QUALIFIED: 'bg-red-100 text-red-700',
};

const TEST_RESULT_CFG: Record<string, string> = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  NA: 'bg-slate-100 text-slate-500',
};

const EMPTY_FORM = {
  welderName: '',
  welderCode: '',
  weldingProcess: 'SMAW',
  position: '',
  baseMaterial: '',
  fillMaterial: '',
  thickness: '',
  diameter: '',
  testDate: '',
  testLocation: '',
  visualResult: 'PASS',
  bendTestResult: 'NA',
  radiographyResult: 'NA',
  overallResult: 'NOT_QUALIFIED',
  qualificationRange: '',
  certificationNumber: '',
  validFrom: '',
  expiryDate: '',
  renewalDate: '',
  notes: '',
};

export function WelderQualificationClient() {
  const [records, setRecords] = useState<WQT[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<WQT | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterProcess, setFilterProcess] = useState('');
  const [filterResult, setFilterResult] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterProcess) p.set('weldingProcess', filterProcess);
    if (filterResult) p.set('overallResult', filterResult);
    const res = await fetch(`/api/qc/welder-qualification${p.toString() ? '?' + p.toString() : ''}`);
    if (res.ok) setRecords(await res.json());
    setLoading(false);
  }, [filterProcess, filterResult]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const kpi = {
    total: records.length,
    qualified: records.filter(r => r.overallResult === 'QUALIFIED').length,
    notQualified: records.filter(r => r.overallResult === 'NOT_QUALIFIED').length,
    expiringSoon: records.filter(r => {
      if (!r.expiryDate) return false;
      const diff = new Date(r.expiryDate).getTime() - Date.now();
      return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
    }).length,
  };

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  }

  function openEdit(r: WQT) {
    setEditing(r);
    setForm({
      welderName: r.welderName,
      welderCode: r.welderCode ?? '',
      weldingProcess: r.weldingProcess,
      position: r.position ?? '',
      baseMaterial: r.baseMaterial ?? '',
      fillMaterial: r.fillMaterial ?? '',
      thickness: r.thickness ?? '',
      diameter: r.diameter ?? '',
      testDate: r.testDate ? r.testDate.slice(0, 10) : '',
      testLocation: r.testLocation ?? '',
      visualResult: r.visualResult ?? 'PASS',
      bendTestResult: r.bendTestResult ?? 'NA',
      radiographyResult: r.radiographyResult ?? 'NA',
      overallResult: r.overallResult,
      qualificationRange: '',
      certificationNumber: r.certificationNumber ?? '',
      validFrom: r.validFrom ? r.validFrom.slice(0, 10) : '',
      expiryDate: r.expiryDate ? r.expiryDate.slice(0, 10) : '',
      renewalDate: r.renewalDate ? r.renewalDate.slice(0, 10) : '',
      notes: r.notes ?? '',
    });
    setDialog(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        testDate: form.testDate ? new Date(form.testDate).toISOString() : null,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        renewalDate: form.renewalDate ? new Date(form.renewalDate).toISOString() : null,
      };
      const url = editing ? `/api/qc/welder-qualification/${editing.id}` : '/api/qc/welder-qualification';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchRecords(); }
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this welder qualification record?')) return;
    setDeleting(id);
    try {
      await fetch(`/api/qc/welder-qualification/${id}`, { method: 'DELETE' });
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
            <Award className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Welder Qualification Register</h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">HEXA-FRM-017</span>
          </div>
          <p className="text-sm text-slate-500">ISO 9001:2015 §7.2, §8.5.1 — Welder competence and process qualification test records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecords}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add WQT</Button>
        </div>
      </div>

      <IsoClauseNote
        storageKey="qc-welder-qualification"
        clauses={[
          { standard: 'ISO 9001', clause: '§7.2', title: 'Competence' },
          { standard: 'ISO 9001', clause: '§8.5.1', title: 'Control of production and service provision' },
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: kpi.total, color: 'text-slate-700', icon: <Award className="h-4 w-4 text-slate-400" /> },
          { label: 'Qualified', value: kpi.qualified, color: 'text-green-700', icon: <CheckCircle2 className="h-4 w-4 text-green-400" /> },
          { label: 'Not Qualified', value: kpi.notQualified, color: 'text-red-700', icon: <XCircle className="h-4 w-4 text-red-400" /> },
          { label: 'Expiring (90d)', value: kpi.expiringSoon, color: 'text-amber-700', icon: <Clock className="h-4 w-4 text-amber-400" /> },
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
        <span className="text-sm text-slate-500">Process:</span>
        {['', 'SMAW', 'GMAW', 'GTAW', 'SAW', 'FCAW'].map(p => (
          <Button key={p} variant={filterProcess === p ? 'default' : 'outline'} size="sm" onClick={() => setFilterProcess(p)}>
            {p === '' ? 'All' : p}
          </Button>
        ))}
        <span className="text-sm text-slate-500 ml-4">Result:</span>
        {['', 'QUALIFIED', 'NOT_QUALIFIED'].map(r => (
          <Button key={r} variant={filterResult === r ? 'default' : 'outline'} size="sm" onClick={() => setFilterResult(r)}>
            {r === '' ? 'All' : r.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No WQT records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['WQT No.', 'Welder', 'Code', 'Process', 'Position', 'Test Date', 'Visual', 'Bend', 'RT', 'Result', 'Expiry', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-3 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{r.wqtNumber}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">{r.welderName}</td>
                      <td className="px-3 py-3 text-slate-600 font-mono text-xs">{r.welderCode ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-700 font-medium">{r.weldingProcess}</td>
                      <td className="px-3 py-3 text-slate-600">{r.position ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        {r.testDate ? new Date(r.testDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-3 py-3">
                        {r.visualResult ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TEST_RESULT_CFG[r.visualResult] ?? ''}`}>{r.visualResult}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        {r.bendTestResult ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TEST_RESULT_CFG[r.bendTestResult] ?? ''}`}>{r.bendTestResult}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        {r.radiographyResult ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TEST_RESULT_CFG[r.radiographyResult] ?? ''}`}>{r.radiographyResult}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${RESULT_CFG[r.overallResult] ?? 'bg-gray-100 text-gray-600'}`}>
                          {r.overallResult.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                        {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}
                      </td>
                      <td className="px-3 py-3">
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
            <DialogTitle>{editing ? 'Edit WQT Record' : 'New Welder Qualification Test'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div>
              <Label>Welder Name *</Label>
              <Input value={form.welderName} onChange={e => f('welderName', e.target.value)} />
            </div>
            <div>
              <Label>Welder Code / Badge #</Label>
              <Input value={form.welderCode} onChange={e => f('welderCode', e.target.value)} />
            </div>
            <div>
              <Label>Welding Process *</Label>
              <Select value={form.weldingProcess} onValueChange={v => f('weldingProcess', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['SMAW', 'GMAW', 'GTAW', 'SAW', 'FCAW'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Position</Label>
              <Input value={form.position} onChange={e => f('position', e.target.value)} placeholder="e.g. 3G, 6G" />
            </div>
            <div>
              <Label>Base Material</Label>
              <Input value={form.baseMaterial} onChange={e => f('baseMaterial', e.target.value)} placeholder="e.g. A36 Carbon Steel" />
            </div>
            <div>
              <Label>Filler Material</Label>
              <Input value={form.fillMaterial} onChange={e => f('fillMaterial', e.target.value)} placeholder="e.g. E7018" />
            </div>
            <div>
              <Label>Thickness</Label>
              <Input value={form.thickness} onChange={e => f('thickness', e.target.value)} placeholder="e.g. 10mm" />
            </div>
            <div>
              <Label>Diameter</Label>
              <Input value={form.diameter} onChange={e => f('diameter', e.target.value)} placeholder="e.g. 2 inch" />
            </div>
            <div>
              <Label>Test Date</Label>
              <Input type="date" value={form.testDate} onChange={e => f('testDate', e.target.value)} />
            </div>
            <div>
              <Label>Test Location</Label>
              <Input value={form.testLocation} onChange={e => f('testLocation', e.target.value)} />
            </div>
            <div>
              <Label>Visual Inspection</Label>
              <Select value={form.visualResult} onValueChange={v => f('visualResult', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">Pass</SelectItem>
                  <SelectItem value="FAIL">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bend Test</Label>
              <Select value={form.bendTestResult} onValueChange={v => f('bendTestResult', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">Pass</SelectItem>
                  <SelectItem value="FAIL">Fail</SelectItem>
                  <SelectItem value="NA">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Radiography (RT)</Label>
              <Select value={form.radiographyResult} onValueChange={v => f('radiographyResult', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASS">Pass</SelectItem>
                  <SelectItem value="FAIL">Fail</SelectItem>
                  <SelectItem value="NA">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Overall Result *</Label>
              <Select value={form.overallResult} onValueChange={v => f('overallResult', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUALIFIED">Qualified</SelectItem>
                  <SelectItem value="NOT_QUALIFIED">Not Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Certification Number</Label>
              <Input value={form.certificationNumber} onChange={e => f('certificationNumber', e.target.value)} />
            </div>
            <div>
              <Label>Valid From</Label>
              <Input type="date" value={form.validFrom} onChange={e => f('validFrom', e.target.value)} />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiryDate} onChange={e => f('expiryDate', e.target.value)} />
            </div>
            <div>
              <Label>Renewal Date</Label>
              <Input type="date" value={form.renewalDate} onChange={e => f('renewalDate', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.welderName.trim()}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
