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
import {
  ClipboardCheck, Plus, RefreshCw, Loader2, Search, Eye,
  CheckCircle2, AlertCircle, Clock,
} from 'lucide-react';

type CarRecord = {
  id: string;
  carNumber: string;
  linkedNcrId: string | null;
  linkedNcrNumber: string | null;
  ncStatement: string | null;
  rootCauseMethod: string | null;
  rootCauseText: string | null;
  actionPlan: string | null;
  responsible: { id: string; name: string } | null;
  targetDate: string | null;
  status: string;
  verificationDate: string | null;
  verificationMethod: string | null;
  verificationResult: string | null;
  verifiedByName: string | null;
  progressLogs: {
    id: string;
    date: string;
    updateText: string;
    evidenceUrl: string | null;
    userName: string | null;
  }[];
  createdAt: string;
};

const CAR_STATUSES = [
  'Draft',
  'CA Planned',
  'In Progress',
  'Pending Verification',
  'Verified Effective',
  'Closed',
];

const STATUS_CFG: Record<string, string> = {
  'Draft':                'bg-slate-100 text-slate-600',
  'CA Planned':           'bg-blue-100 text-blue-700',
  'In Progress':          'bg-amber-100 text-amber-700',
  'Pending Verification': 'bg-purple-100 text-purple-700',
  'Verified Effective':   'bg-emerald-100 text-emerald-700',
  'Closed':               'bg-green-100 text-green-700',
};

const ROOT_CAUSE_METHODS = ['5-Why', 'Ishikawa', 'Direct statement'];
const VERIFICATION_METHODS = ['re-audit', 'document review', 'observation'];
const VERIFICATION_RESULTS = ['Effective', 'Not effective — re-open'];

const ISO_CLAUSES = [
  { standard: 'ISO 9001:2015', clause: '§10.2', title: 'Nonconformity and corrective action' },
];

function StatusBadge({ s }: { s: string }) {
  const cls = STATUS_CFG[s] ?? 'bg-gray-100 text-gray-700';
  return <span className={`px-2 py-0.5 text-xs rounded-full ${cls}`}>{s}</span>;
}

const today = new Date().toISOString().split('T')[0];

function isOverdue(car: CarRecord): boolean {
  if (!car.targetDate) return false;
  if (car.status === 'Closed' || car.status === 'Verified Effective') return false;
  return car.targetDate.split('T')[0] < today;
}

export function CarRegisterClient() {
  const [cars, setCars] = useState<CarRecord[]>([]);
  const [filtered, setFiltered] = useState<CarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  const [createDialog, setCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    linkedNcrNumber: '',
    ncStatement: '',
    rootCauseMethod: ROOT_CAUSE_METHODS[0],
    rootCauseText: '',
    actionPlan: '',
    responsibleId: '',
    targetDate: '',
  });

  const [viewDialog, setViewDialog] = useState(false);
  const [selected, setSelected] = useState<CarRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'progress' | 'verification'>('details');
  const [updating, setUpdating] = useState(false);

  const [detailForm, setDetailForm] = useState({
    status: '',
    ncStatement: '',
    rootCauseMethod: '',
    rootCauseText: '',
    actionPlan: '',
    responsibleId: '',
    targetDate: '',
  });

  const [progressText, setProgressText] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  const [verifForm, setVerifForm] = useState({
    verificationDate: '',
    verificationMethod: VERIFICATION_METHODS[0],
    verificationResult: VERIFICATION_RESULTS[0],
    verifiedByName: '',
  });
  const [savingVerif, setSavingVerif] = useState(false);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const [carsRes, usersRes] = await Promise.all([
      fetch('/api/ims/car'),
      fetch('/api/users'),
    ]);
    if (carsRes.ok) setCars(await carsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (!silent) setLoading(false);
    else setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    let f = [...cars];
    if (statusF !== 'all') f = f.filter(c => c.status === statusF);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(c =>
        c.carNumber.toLowerCase().includes(q) ||
        (c.linkedNcrNumber ?? '').toLowerCase().includes(q)
      );
    }
    setFiltered(f);
  }, [cars, statusF, search]);

  const kpi = {
    total:               cars.length,
    inProgress:          cars.filter(c => c.status === 'In Progress').length,
    pendingVerification: cars.filter(c => c.status === 'Pending Verification').length,
    overdue:             cars.filter(isOverdue).length,
  };

  const resetCreateForm = () => setCreateForm({
    linkedNcrNumber: '',
    ncStatement: '',
    rootCauseMethod: ROOT_CAUSE_METHODS[0],
    rootCauseText: '',
    actionPlan: '',
    responsibleId: '',
    targetDate: '',
  });

  const createCar = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ims/car', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedNcrNumber: createForm.linkedNcrNumber || null,
          ncStatement: createForm.ncStatement || null,
          rootCauseMethod: createForm.rootCauseMethod || null,
          rootCauseText: createForm.rootCauseText || null,
          actionPlan: createForm.actionPlan || null,
          responsibleId: createForm.responsibleId || null,
          targetDate: createForm.targetDate ? new Date(createForm.targetDate).toISOString() : null,
        }),
      });
      if (res.ok) {
        setCreateDialog(false);
        resetCreateForm();
        fetchAll(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const openView = (car: CarRecord) => {
    setSelected(car);
    setDetailForm({
      status: car.status,
      ncStatement: car.ncStatement ?? '',
      rootCauseMethod: car.rootCauseMethod ?? ROOT_CAUSE_METHODS[0],
      rootCauseText: car.rootCauseText ?? '',
      actionPlan: car.actionPlan ?? '',
      responsibleId: car.responsible?.id ?? '',
      targetDate: car.targetDate ? car.targetDate.split('T')[0] : '',
    });
    setVerifForm({
      verificationDate: car.verificationDate ? car.verificationDate.split('T')[0] : '',
      verificationMethod: car.verificationMethod ?? VERIFICATION_METHODS[0],
      verificationResult: car.verificationResult ?? VERIFICATION_RESULTS[0],
      verifiedByName: car.verifiedByName ?? '',
    });
    setProgressText('');
    setActiveTab('details');
    setViewDialog(true);
  };

  const saveDetails = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/ims/car/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: detailForm.status,
          ncStatement: detailForm.ncStatement || null,
          rootCauseMethod: detailForm.rootCauseMethod || null,
          rootCauseText: detailForm.rootCauseText || null,
          actionPlan: detailForm.actionPlan || null,
          responsibleId: detailForm.responsibleId || null,
          targetDate: detailForm.targetDate ? new Date(detailForm.targetDate).toISOString() : null,
        }),
      });
      if (res.ok) { setViewDialog(false); fetchAll(true); }
    } finally {
      setUpdating(false);
    }
  };

  const saveProgressLog = async () => {
    if (!selected || !progressText.trim()) return;
    setSavingLog(true);
    try {
      const res = await fetch(`/api/ims/car/${selected.id}/progress-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateText: progressText.trim() }),
      });
      if (res.ok) {
        setProgressText('');
        fetchAll(true);
        const updated = await fetch(`/api/ims/car/${selected.id}`);
        if (updated.ok) {
          const data: CarRecord = await updated.json();
          setSelected(data);
        }
      }
    } finally {
      setSavingLog(false);
    }
  };

  const saveVerification = async () => {
    if (!selected) return;
    setSavingVerif(true);
    try {
      const res = await fetch(`/api/ims/car/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationDate: verifForm.verificationDate ? new Date(verifForm.verificationDate).toISOString() : null,
          verificationMethod: verifForm.verificationMethod || null,
          verificationResult: verifForm.verificationResult || null,
          verifiedByName: verifForm.verifiedByName || null,
          status: 'Verified Effective',
        }),
      });
      if (res.ok) { setViewDialog(false); fetchAll(true); }
    } finally {
      setSavingVerif(false);
    }
  };

  const showVerificationTab =
    selected?.status === 'Pending Verification' ||
    selected?.status === 'Verified Effective' ||
    selected?.status === 'Closed';

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="h-5 w-5 text-slate-300" />
              <span className="text-slate-300 text-xs font-semibold uppercase tracking-widest">IMS — Integrated Management System</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Corrective Action Register</h1>
            <p className="text-slate-300 mt-0.5 text-sm">ISO 9001:2015 §10.2 — Corrective action planning and verification</p>
            <p className="text-slate-400/70 text-xs font-mono mt-1">
              HEXA-FRM-025 · Procedure: Hexa-ISP-005
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10 h-8 w-8 p-0"
              onClick={() => fetchAll(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              className="bg-white text-[#2c3e50] hover:bg-slate-100 font-semibold shadow"
              onClick={() => setCreateDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New CAR
            </Button>
          </div>
        </div>
      </div>

      <IsoClauseNote storageKey="ims-car" clauses={ISO_CLAUSES} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',                value: kpi.total,               icon: ClipboardCheck, color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200' },
          { label: 'In Progress',          value: kpi.inProgress,          icon: Clock,          color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
          { label: 'Pending Verification', value: kpi.pendingVerification, icon: AlertCircle,    color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
          { label: 'Overdue',              value: kpi.overdue,             icon: AlertCircle,    color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
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

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search CAR # or linked NCR…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', ...CAR_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusF(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                statusF === s
                  ? 'bg-[#2c3e50] text-white border-[#2c3e50]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-400" />
              <p className="text-slate-400 text-sm">Loading corrective actions…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 text-sm">No corrective action records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#2c3e50] text-white">
                    {['CAR #', 'Linked NCR', 'NC Statement', 'Responsible', 'Target Date', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(car => (
                    <tr key={car.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-xs text-[#2c3e50] bg-[#2c3e50]/8 px-2 py-0.5 rounded">
                          {car.carNumber}
                        </span>
                        {isOverdue(car) && (
                          <span className="ml-1.5 text-xs text-red-600 font-medium">Overdue</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {car.linkedNcrNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-slate-700 truncate text-xs">{car.ncStatement ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {car.responsible?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {car.targetDate
                          ? new Date(car.targetDate).toLocaleDateString('en-SA-u-ca-gregory')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge s={car.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => openView(car)}
                        >
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialog} onOpenChange={v => { setCreateDialog(v); if (!v) resetCreateForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[#2c3e50]" />
              New Corrective Action Record
            </DialogTitle>
            <p className="text-xs text-slate-400 font-mono mt-0.5">HEXA-FRM-025 · Hexa-ISP-005 · ISO 9001:2015 §10.2</p>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <Label>Linked NCR Number (optional)</Label>
              <Input
                value={createForm.linkedNcrNumber}
                onChange={e => setCreateForm(f => ({ ...f, linkedNcrNumber: e.target.value }))}
                placeholder="e.g. NCR-2026-001"
                className="mt-1"
              />
            </div>
            <div>
              <Label>NC Statement</Label>
              <Textarea
                rows={3}
                value={createForm.ncStatement}
                onChange={e => setCreateForm(f => ({ ...f, ncStatement: e.target.value }))}
                placeholder="Describe the nonconformance…"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Root Cause Method</Label>
                <Select
                  value={createForm.rootCauseMethod}
                  onValueChange={v => setCreateForm(f => ({ ...f, rootCauseMethod: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOT_CAUSE_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsible</Label>
                <Select
                  value={createForm.responsibleId || '__none__'}
                  onValueChange={v => setCreateForm(f => ({ ...f, responsibleId: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Root Cause Analysis</Label>
              <Textarea
                rows={3}
                value={createForm.rootCauseText}
                onChange={e => setCreateForm(f => ({ ...f, rootCauseText: e.target.value }))}
                placeholder="Describe the root cause…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Action Plan</Label>
              <Textarea
                rows={3}
                value={createForm.actionPlan}
                onChange={e => setCreateForm(f => ({ ...f, actionPlan: e.target.value }))}
                placeholder="Planned corrective actions…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Target Date</Label>
              <Input
                type="date"
                value={createForm.targetDate}
                onChange={e => setCreateForm(f => ({ ...f, targetDate: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(false); resetCreateForm(); }}>Cancel</Button>
            <Button
              onClick={createCar}
              disabled={saving}
              className="bg-[#2c3e50] hover:bg-[#34495e]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create CAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-[#2c3e50]" />
                  {selected.carNumber}
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">HEXA-FRM-025 · Hexa-ISP-005</p>
                <div className="rounded-lg bg-[#2c3e50]/5 border border-[#2c3e50]/10 p-3 mt-2">
                  <p className="text-sm text-slate-700 leading-snug">{selected.ncStatement ?? '—'}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <StatusBadge s={selected.status} />
                    {selected.linkedNcrNumber && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                        NCR: {selected.linkedNcrNumber}
                      </span>
                    )}
                    {isOverdue(selected) && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">Overdue</span>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="border-b flex gap-4 -mt-1">
                {(
                  [
                    { key: 'details', label: 'Details' },
                    { key: 'progress', label: 'Progress Log' },
                    ...(showVerificationTab ? [{ key: 'verification', label: 'Verification' }] : []),
                  ] as { key: 'details' | 'progress' | 'verification'; label: string }[]
                ).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === t.key
                        ? 'border-[#2c3e50] text-[#2c3e50]'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1 py-1">
                {activeTab === 'details' && (
                  <>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={detailForm.status}
                        onValueChange={v => setDetailForm(f => ({ ...f, status: v }))}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CAR_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>NC Statement</Label>
                      <Textarea
                        rows={3}
                        value={detailForm.ncStatement}
                        onChange={e => setDetailForm(f => ({ ...f, ncStatement: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Root Cause Method</Label>
                        <Select
                          value={detailForm.rootCauseMethod || ROOT_CAUSE_METHODS[0]}
                          onValueChange={v => setDetailForm(f => ({ ...f, rootCauseMethod: v }))}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROOT_CAUSE_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Responsible</Label>
                        <Select
                          value={detailForm.responsibleId || '__none__'}
                          onValueChange={v => setDetailForm(f => ({ ...f, responsibleId: v === '__none__' ? '' : v }))}
                        >
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Root Cause Analysis</Label>
                      <Textarea
                        rows={3}
                        value={detailForm.rootCauseText}
                        onChange={e => setDetailForm(f => ({ ...f, rootCauseText: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Action Plan</Label>
                      <Textarea
                        rows={3}
                        value={detailForm.actionPlan}
                        onChange={e => setDetailForm(f => ({ ...f, actionPlan: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Target Date</Label>
                      <Input
                        type="date"
                        value={detailForm.targetDate}
                        onChange={e => setDetailForm(f => ({ ...f, targetDate: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'progress' && (
                  <>
                    {selected.progressLogs.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">No progress entries yet.</p>
                    ) : (
                      <ol className="relative border-l border-slate-200 ml-3 space-y-5">
                        {selected.progressLogs.map(log => (
                          <li key={log.id} className="ml-6">
                            <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            </span>
                            <p className="text-xs text-slate-500">
                              {new Date(log.date).toLocaleString('en-SA-u-ca-gregory')}
                              {log.userName ? ` · ${log.userName}` : ''}
                            </p>
                            <p className="text-sm text-slate-700 mt-0.5">{log.updateText}</p>
                            {log.evidenceUrl && (
                              <a
                                href={log.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline mt-0.5 inline-block"
                              >
                                Evidence
                              </a>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                    <div className="border-t pt-3 space-y-2">
                      <Label>Add Update</Label>
                      <Textarea
                        rows={3}
                        value={progressText}
                        onChange={e => setProgressText(e.target.value)}
                        placeholder="Describe progress made…"
                        className="mt-1"
                      />
                      <Button
                        size="sm"
                        onClick={saveProgressLog}
                        disabled={savingLog || !progressText.trim()}
                        className="bg-[#2c3e50] hover:bg-[#34495e]"
                      >
                        {savingLog ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                        Save Update
                      </Button>
                    </div>
                  </>
                )}

                {activeTab === 'verification' && showVerificationTab && (
                  <>
                    <div>
                      <Label>Verification Date</Label>
                      <Input
                        type="date"
                        value={verifForm.verificationDate}
                        onChange={e => setVerifForm(f => ({ ...f, verificationDate: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Verification Method</Label>
                      <Select
                        value={verifForm.verificationMethod}
                        onValueChange={v => setVerifForm(f => ({ ...f, verificationMethod: v }))}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VERIFICATION_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Verification Result</Label>
                      <Select
                        value={verifForm.verificationResult}
                        onValueChange={v => setVerifForm(f => ({ ...f, verificationResult: v }))}
                      >
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VERIFICATION_RESULTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Verified By</Label>
                      <Input
                        value={verifForm.verifiedByName}
                        onChange={e => setVerifForm(f => ({ ...f, verifiedByName: e.target.value }))}
                        placeholder="Name of verifier"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialog(false)}>Cancel</Button>
                {activeTab === 'details' && (
                  <Button onClick={saveDetails} disabled={updating} className="bg-[#2c3e50] hover:bg-[#34495e]">
                    {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                )}
                {activeTab === 'verification' && showVerificationTab && (
                  <Button onClick={saveVerification} disabled={savingVerif} className="bg-emerald-600 hover:bg-emerald-700">
                    {savingVerif ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Save Verification
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
