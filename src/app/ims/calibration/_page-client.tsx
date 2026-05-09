'use client';

import { useState, useEffect, useCallback } from 'react';
import { IsoClauseNote } from '@/components/ims/IsoClauseNote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gauge, RefreshCw, Pencil, AlertTriangle, CheckCircle2, Clock, Search, Wrench, Plus, FileText } from 'lucide-react';
import { generateCalibrationRecordPDF } from '@/lib/ims-calibration-pdf-generator';

type CalibrationAsset = {
  id: string;
  assetCode: string | null;
  name: string;
  category: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  calibrationFrequency: string | null;
  lastCalibratedAt: string | null;
  calibrationDueAt: string | null;
  calibrationCertRef: string | null;
  calibrationBody: string | null;
  calibrationStatus: string | null;
  location: string | null;
  derivedStatus: 'CURRENT' | 'DUE_SOON' | 'OVERDUE';
};

const RESULT_CFG: Record<string, { label: string; cls: string }> = {
  PASS: { label: 'Pass', cls: 'bg-green-100 text-green-700' },
  FAIL: { label: 'Fail', cls: 'bg-red-100 text-red-700' },
  CONDITIONAL: { label: 'Conditional', cls: 'bg-amber-100 text-amber-700' },
};

const DERIVED_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  CURRENT: { label: 'Current', cls: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  DUE_SOON: { label: 'Due Soon', cls: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3.5 w-3.5" /> },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-100 text-red-700', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

const EMPTY_FORM = {
  calibrationCertRef: '',
  calibrationBody: '',
  lastCalibratedAt: '',
  calibrationDueAt: '',
  calibrationStatus: 'PASS',
};

function fmt(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function CalibrationClient() {
  const [records, setRecords] = useState<CalibrationAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDerived, setFilterDerived] = useState('');
  const [dialog, setDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [editing, setEditing] = useState<CalibrationAsset | null>(null);
  const [viewing, setViewing] = useState<CalibrationAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/ims/calibration?${params}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function openEdit(asset: CalibrationAsset) {
    setEditing(asset);
    setForm({
      calibrationCertRef: asset.calibrationCertRef ?? '',
      calibrationBody: asset.calibrationBody ?? '',
      lastCalibratedAt: asset.lastCalibratedAt ? asset.lastCalibratedAt.slice(0, 10) : '',
      calibrationDueAt: asset.calibrationDueAt ? asset.calibrationDueAt.slice(0, 10) : '',
      calibrationStatus: asset.calibrationStatus ?? 'PASS',
    });
    setDialog(true);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      await fetch('/api/ims/calibration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...form }),
      });
      setDialog(false);
      fetchRecords();
    } finally {
      setSaving(false);
    }
  }

  function openView(asset: CalibrationAsset) {
    setViewing(asset);
    setViewDialog(true);
  }

  async function handleGeneratePDF(asset: CalibrationAsset) {
    setGeneratingPDF(true);
    try {
      const blob = await generateCalibrationRecordPDF({
        assetCode: asset.assetCode || 'N/A',
        assetName: asset.name,
        make: asset.make,
        model: asset.model,
        serialNumber: asset.serialNumber,
        location: asset.location,
        calibrationFrequency: asset.calibrationFrequency,
        lastCalibratedAt: asset.lastCalibratedAt,
        calibrationDueAt: asset.calibrationDueAt,
        calibrationCertRef: asset.calibrationCertRef,
        calibrationBody: asset.calibrationBody,
        calibrationStatus: asset.calibrationStatus,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Calibration_${asset.assetCode}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPDF(false);
    }
  }

  const filtered = records.filter(r =>
    (!filterDerived || r.derivedStatus === filterDerived)
  );

  const counts = {
    total: records.length,
    overdue: records.filter(r => r.derivedStatus === 'OVERDUE').length,
    dueSoon: records.filter(r => r.derivedStatus === 'DUE_SOON').length,
    current: records.filter(r => r.derivedStatus === 'CURRENT').length,
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <IsoClauseNote
        storageKey="ims-calibration"
        clauses={[
          { standard: 'ISO 9001:2015', clause: '§7.1.5', title: 'Monitoring and measuring resources' },
        ]}
      />

      {/* Hero */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-[#2c3e50]" />
          <h1 className="text-xl font-bold text-[#2c3e50]">Calibration Register</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#2c3e50] text-white">HEXA-FRM-022</span>
        </div>
        <p className="text-sm text-slate-500">Equipment calibration status · ISO §7.1.5 · Procedure: Hexa-ISP-015</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border border-slate-200">
          <CardContent className="p-3">
            <p className="text-xs text-slate-500">Total Equipment</p>
            <p className="text-2xl font-bold text-[#2c3e50]">{counts.total}</p>
          </CardContent>
        </Card>
        <Card className="border border-green-200">
          <CardContent className="p-3">
            <p className="text-xs text-green-600">Current</p>
            <p className="text-2xl font-bold text-green-700">{counts.current}</p>
          </CardContent>
        </Card>
        <Card className="border border-amber-200">
          <CardContent className="p-3">
            <p className="text-xs text-amber-600">Due Soon (≤30 days)</p>
            <p className="text-2xl font-bold text-amber-700">{counts.dueSoon}</p>
          </CardContent>
        </Card>
        <Card className="border border-red-200">
          <CardContent className="p-3">
            <p className="text-xs text-red-600">Overdue</p>
            <p className="text-2xl font-bold text-red-700">{counts.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-slate-200">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search equipment name..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterDerived || 'ALL'} onValueChange={v => setFilterDerived(v === 'ALL' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="CURRENT">Current</SelectItem>
                <SelectItem value="DUE_SOON">Due Soon</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchRecords()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Calibration-Required Equipment
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No equipment found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left font-medium">Asset Code</th>
                    <th className="px-4 py-2 text-left font-medium">Equipment</th>
                    <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Serial No.</th>
                    <th className="px-4 py-2 text-left font-medium hidden lg:table-cell">Location</th>
                    <th className="px-4 py-2 text-left font-medium">Last Calibrated</th>
                    <th className="px-4 py-2 text-left font-medium">Due Date</th>
                    <th className="px-4 py-2 text-left font-medium hidden md:table-cell">Result</th>
                    <th className="px-4 py-2 text-left font-medium hidden lg:table-cell">Cert. Ref.</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(asset => {
                    const ds = DERIVED_CFG[asset.derivedStatus];
                    const rs = asset.calibrationStatus ? RESULT_CFG[asset.calibrationStatus] : null;
                    return (
                      <tr key={asset.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{asset.assetCode ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{asset.name}</div>
                          {(asset.make || asset.model) && (
                            <div className="text-xs text-slate-400">{[asset.make, asset.model].filter(Boolean).join(' ')}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">{asset.serialNumber ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 hidden lg:table-cell text-xs">{asset.location ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{fmt(asset.lastCalibratedAt)}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`font-medium ${asset.derivedStatus === 'OVERDUE' ? 'text-red-600' : asset.derivedStatus === 'DUE_SOON' ? 'text-amber-600' : 'text-slate-600'}`}>
                            {fmt(asset.calibrationDueAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {rs ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${rs.cls}`}>{rs.label}</span>
                          ) : <span className="text-slate-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                          {asset.calibrationCertRef ?? '—'}
                          {asset.calibrationBody && (
                            <div className="text-slate-400 text-xs">{asset.calibrationBody}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ds.cls}`}>
                            {ds.icon}{ds.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-500 hover:text-[#2c3e50]" onClick={() => handleGeneratePDF(asset)} title="Print Calibration Certificate (PDF)" disabled={generatingPDF}>
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openView(asset)} title="View Details">
                              <Search className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(asset)} title="Update Record">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#2c3e50]" />
              Update Calibration Record
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-800">{editing.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editing.assetCode ?? ''}{editing.serialNumber ? ` · S/N: ${editing.serialNumber}` : ''}
                  {editing.calibrationFrequency ? ` · Frequency: ${editing.calibrationFrequency}` : ''}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Last Calibrated</Label>
                  <Input type="date" value={form.lastCalibratedAt} onChange={e => setForm(f => ({ ...f, lastCalibratedAt: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Next Due Date</Label>
                  <Input type="date" value={form.calibrationDueAt} onChange={e => setForm(f => ({ ...f, calibrationDueAt: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Calibration Result</Label>
                <Select value={form.calibrationStatus} onValueChange={v => setForm(f => ({ ...f, calibrationStatus: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASS">Pass</SelectItem>
                    <SelectItem value="FAIL">Fail</SelectItem>
                    <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Certificate Reference</Label>
                <Input
                  placeholder="e.g. CERT-2026-0123"
                  value={form.calibrationCertRef}
                  onChange={e => setForm(f => ({ ...f, calibrationCertRef: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Calibration Body (Lab name + IAS accreditation)</Label>
                <Input
                  placeholder="e.g. SASO Lab · IAS Accreditation No. L-1234"
                  value={form.calibrationBody}
                  onChange={e => setForm(f => ({ ...f, calibrationBody: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button className="bg-[#2c3e50] hover:bg-[#1a252f] text-white" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog with PDF Generation */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#2c3e50]" />
              Calibration Record
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">Equipment Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium text-slate-600">Asset Code:</span> {viewing.assetCode ?? '—'}</div>
                  <div><span className="font-medium text-slate-600">Name:</span> {viewing.name}</div>
                  <div><span className="font-medium text-slate-600">Make:</span> {viewing.make ?? '—'}</div>
                  <div><span className="font-medium text-slate-600">Model:</span> {viewing.model ?? '—'}</div>
                  <div><span className="font-medium text-slate-600">Serial No.:</span> {viewing.serialNumber ?? '—'}</div>
                  <div><span className="font-medium text-slate-600">Location:</span> {viewing.location ?? '—'}</div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-slate-800 mb-3">Calibration Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium text-slate-600">Frequency:</span> {viewing.calibrationFrequency ?? '—'}</div>
                  <div><span className="font-medium text-slate-600">Last Calibrated:</span> {fmt(viewing.lastCalibratedAt)}</div>
                  <div><span className="font-medium text-slate-600">Due Date:</span> {fmt(viewing.calibrationDueAt)}</div>
                  <div><span className="font-medium text-slate-600">Result:</span> {viewing.calibrationStatus ?? '—'}</div>
                  <div><span className="font-medium text-slate-600">Cert. Ref:</span> {viewing.calibrationCertRef ?? '—'}</div>
                  <div><span className="font-medium text-slate-600">Calibration Body:</span> {viewing.calibrationBody ?? '—'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-xs text-amber-700">
                  <strong>ISO 9001:2015 §7.1.5:</strong> Equipment must be calibrated at defined intervals or prior to use, against measurement standards traceable to international or national standards.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>Close</Button>
            <Button 
              className="bg-[#2c3e50] hover:bg-[#1a252f] text-white" 
              onClick={() => viewing && handleGeneratePDF(viewing)}
              disabled={generatingPDF}
            >
              <FileText className="h-4 w-4 mr-2" />
              {generatingPDF ? 'Generating...' : 'Print Certificate (PDF)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
