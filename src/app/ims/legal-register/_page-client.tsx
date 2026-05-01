'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Scale, Plus, Search, RefreshCw, CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';

type LegalEntry = {
  id: string;
  referenceNumber: string;
  title: string;
  standard: string;
  isoStandard: string;
  category: string;
  applicableTo: string;
  complianceStatus: string;
  lastReviewedAt: string | null;
  nextReviewDue: string | null;
  reviewFrequency: string;
  notes: string | null;
  evidenceInOts: string | null;
  responsible: { id: string; name: string } | null;
};

const ISO_STANDARDS = ['All', 'ISO 9001', 'ISO 14001', 'ISO 45001'];
const CATEGORIES = ['Legal', 'Regulatory', 'Contractual', 'Other'];
const COMPLIANCE_STATUSES = ['Compliant', 'Partial', 'Non-Compliant', 'Under Review'];
const REVIEW_FREQUENCIES = ['Annual', 'Semi-Annual', 'Quarterly'];
const APPLICABLE_TO_OPTIONS = ['All', 'Production', 'HR', 'QC', 'Finance', 'HSE', 'HR / Finance', 'HSE / Production', 'Production / QC', 'HR / Finance'];

const EMPTY_FORM = {
  referenceNumber: '',
  title: '',
  standard: '',
  isoStandard: 'ISO 9001',
  category: 'Regulatory',
  applicableTo: 'All',
  complianceStatus: 'Under Review',
  reviewFrequency: 'Annual',
  lastReviewedAt: '',
  nextReviewDue: '',
  responsibleId: '',
  notes: '',
  evidenceInOts: '',
};

function statusBadge(s: string) {
  const cfg: Record<string, { cls: string; icon: React.ReactNode }> = {
    Compliant: { cls: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3 h-3" /> },
    Partial: { cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> },
    'Non-Compliant': { cls: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3" /> },
    'Under Review': { cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const c = cfg[s] ?? { cls: 'bg-gray-100 text-gray-600', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${c.cls}`}>
      {c.icon}{s}
    </span>
  );
}

function isoDot(iso: string) {
  const colors: Record<string, string> = {
    'ISO 9001': 'bg-blue-500',
    'ISO 14001': 'bg-green-500',
    'ISO 45001': 'bg-orange-500',
    'All': 'bg-slate-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[iso] ?? 'bg-gray-400'} mr-1`} />;
}

export function LegalRegisterClient() {
  const [entries, setEntries] = useState<LegalEntry[]>([]);
  const [filtered, setFiltered] = useState<LegalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isoTab, setIsoTab] = useState('All');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialog, setDialog] = useState(false);
  const [editEntry, setEditEntry] = useState<LegalEntry | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (isoTab !== 'All') params.set('isoStandard', isoTab);
    const res = await fetch(`/api/ims/legal-register?${params}`);
    if (res.ok) setEntries(await res.json());
    setLoading(false);
  }, [isoTab]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    let f = [...entries];
    if (search) f = f.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.referenceNumber.includes(search) || e.standard.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== 'all') f = f.filter(e => e.complianceStatus === statusFilter);
    setFiltered(f);
  }, [entries, search, statusFilter]);

  const kpi = {
    compliant: entries.filter(e => e.complianceStatus === 'Compliant').length,
    partial: entries.filter(e => e.complianceStatus === 'Partial').length,
    nonCompliant: entries.filter(e => e.complianceStatus === 'Non-Compliant').length,
    dueForReview: entries.filter(e => e.nextReviewDue && new Date(e.nextReviewDue) <= new Date(Date.now() + 30 * 864e5)).length,
  };

  const openCreate = async () => {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setEditEntry(null);
    setForm({ ...EMPTY_FORM });
    setDialog(true);
  };

  const openEdit = async (entry: LegalEntry) => {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setEditEntry(entry);
    setForm({
      referenceNumber: entry.referenceNumber,
      title: entry.title,
      standard: entry.standard,
      isoStandard: entry.isoStandard,
      category: entry.category,
      applicableTo: entry.applicableTo,
      complianceStatus: entry.complianceStatus,
      reviewFrequency: entry.reviewFrequency,
      lastReviewedAt: entry.lastReviewedAt ? entry.lastReviewedAt.split('T')[0] : '',
      nextReviewDue: entry.nextReviewDue ? entry.nextReviewDue.split('T')[0] : '',
      responsibleId: entry.responsible?.id ?? '',
      notes: entry.notes ?? '',
      evidenceInOts: entry.evidenceInOts ?? '',
    });
    setDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        lastReviewedAt: form.lastReviewedAt ? new Date(form.lastReviewedAt).toISOString() : null,
        nextReviewDue: form.nextReviewDue ? new Date(form.nextReviewDue).toISOString() : null,
        responsibleId: form.responsibleId || null,
        notes: form.notes || null,
        evidenceInOts: form.evidenceInOts || null,
      };
      const url = editEntry ? `/api/ims/legal-register/${editEntry.id}` : '/api/ims/legal-register';
      const method = editEntry ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { setDialog(false); fetchEntries(); }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Scale className="w-8 h-8 text-slate-300" />
          <div>
            <h1 className="text-2xl font-bold">Legal & Regulatory Register</h1>
            <p className="text-slate-300 text-sm">ISO 9001 / 14001 / 45001 §6.1.3 — Compliance obligations register</p>
            <p className="text-slate-500 text-xs font-mono mt-0.5">Form: HEXA-FRM-027 · Procedure: Hexa-ISP-007</p>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Compliant', value: kpi.compliant, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'Partial', value: kpi.partial, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Non-Compliant', value: kpi.nonCompliant, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: 'Due for Review (30d)', value: kpi.dueForReview, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-lg border p-4 ${k.bg}`}>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* ISO Standard Tabs */}
      <div className="border-b flex gap-6">
        {ISO_STANDARDS.map(iso => (
          <button key={iso} onClick={() => setIsoTab(iso)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${isoTab === iso ? 'border-slate-700 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {iso !== 'All' && isoDot(iso)}{iso}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search regulation..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {COMPLIANCE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchEntries}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" onClick={openCreate} className="bg-slate-800 hover:bg-slate-700">
            <Plus className="w-4 h-4 mr-1" /> Add Regulation
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Ref #</th>
                  <th className="px-4 py-3 text-left">Regulation / Standard</th>
                  <th className="px-4 py-3 text-left">ISO</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Applicable To</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Next Review</th>
                  <th className="px-4 py-3 text-left">Frequency</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No regulations found</td></tr>
                ) : filtered.map(e => (
                  <tr key={e.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.referenceNumber}</td>
                    <td className="px-4 py-3 font-medium max-w-xs">
                      <p className="truncate">{e.title}</p>
                      <p className="text-xs text-slate-400 truncate">{e.standard}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center">{isoDot(e.isoStandard)}<span className="text-xs">{e.isoStandard}</span></span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{e.category}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{e.applicableTo}</td>
                    <td className="px-4 py-3">{statusBadge(e.complianceStatus)}</td>
                    <td className="px-4 py-3 text-xs">
                      {e.nextReviewDue
                        ? <span className={new Date(e.nextReviewDue) < new Date() ? 'text-red-600 font-semibold' : ''}>
                            {new Date(e.nextReviewDue).toLocaleDateString('en-SA-u-ca-gregory')}
                          </span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{e.reviewFrequency}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(e)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Edit Regulation' : 'Add New Regulation'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div>
              <Label>Reference Number *</Label>
              <Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="e.g. LR-013" className="mt-1" />
            </div>
            <div>
              <Label>ISO Standard *</Label>
              <Select value={form.isoStandard} onValueChange={v => setForm(f => ({ ...f, isoStandard: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ISO 9001', 'ISO 14001', 'ISO 45001', 'All'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Regulation title" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Standard / Authority *</Label>
              <Input value={form.standard} onChange={e => setForm(f => ({ ...f, standard: e.target.value }))} placeholder="e.g. MHRSD Saudi Labor Law (Royal Decree M/51)" className="mt-1" />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Applicable To *</Label>
              <Input value={form.applicableTo} onChange={e => setForm(f => ({ ...f, applicableTo: e.target.value }))} placeholder="e.g. All / HR / Production" className="mt-1" />
            </div>
            <div>
              <Label>Compliance Status *</Label>
              <Select value={form.complianceStatus} onValueChange={v => setForm(f => ({ ...f, complianceStatus: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{COMPLIANCE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Review Frequency *</Label>
              <Select value={form.reviewFrequency} onValueChange={v => setForm(f => ({ ...f, reviewFrequency: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{REVIEW_FREQUENCIES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Last Reviewed</Label>
              <Input type="date" value={form.lastReviewedAt} onChange={e => setForm(f => ({ ...f, lastReviewedAt: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Next Review Due</Label>
              <Input type="date" value={form.nextReviewDue} onChange={e => setForm(f => ({ ...f, nextReviewDue: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Responsible Person</Label>
              <Select value={form.responsibleId} onValueChange={v => setForm(f => ({ ...f, responsibleId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select person" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Evidence in OTS</Label>
              <Input value={form.evidenceInOts} onChange={e => setForm(f => ({ ...f, evidenceInOts: e.target.value }))} placeholder="e.g. HR Module / Payroll" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title || !form.standard || !form.referenceNumber}>
              {saving ? 'Saving...' : editEntry ? 'Save Changes' : 'Create Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
