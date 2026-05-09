'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertTriangle, Plus, Search, Loader2, Eye, FileDown,
  CheckCircle2, Clock, XCircle, ClipboardX, Filter,
  History, Save, Trash2, ShieldAlert,
} from 'lucide-react';
import { generateQaNCRPDF } from '@/lib/ims-ncr-pdf-generator';

type ImsNcr = {
  id: string;
  ncrNumber: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  deadline: string;
  closedAt: string | null;
  createdAt: string;
  department: string | null;
  auditNumber: string | null;
  auditFindingId: string | null;
  auditFinding: { id: string; findingNumber: string; type: string; clause: string } | null;
  rootCause: string | null;
  correctiveAction: string | null;
  preventiveAction: string | null;
  caVerificationMethod: string | null;
  caEffectivenessRating: string | null;
  caTargetDate: string | null;
  raisedBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  closedBy: { id: string; name: string; email: string } | null;
  caResponsible: { id: string; name: string } | null;
};

const SEVERITY_CFG: Record<string, { cls: string; label: string }> = {
  Low:      { cls: 'bg-blue-100 text-blue-700',    label: 'Low' },
  Medium:   { cls: 'bg-yellow-100 text-yellow-700', label: 'Medium' },
  High:     { cls: 'bg-orange-100 text-orange-700', label: 'High' },
  Critical: { cls: 'bg-red-100 text-red-700 font-bold', label: 'Critical' },
};

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  OPEN:        { cls: 'bg-orange-100 text-orange-700', label: 'Open' },
  IN_PROGRESS: { cls: 'bg-blue-100 text-blue-700',     label: 'In Progress' },
  CLOSED:      { cls: 'bg-green-100 text-green-700',   label: 'Closed' },
};

const CATEGORIES = ['System', 'Process', 'Service', 'Safety', 'Environmental'];

function SeverityBadge({ s }: { s: string }) {
  const c = SEVERITY_CFG[s] ?? { cls: 'bg-gray-100 text-gray-700', label: s };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${c.cls}`}>{c.label}</span>;
}
function StatusBadge({ s }: { s: string }) {
  const c = STATUS_CFG[s] ?? { cls: 'bg-gray-100 text-gray-700', label: s };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${c.cls}`}>{c.label}</span>;
}

export default function ImsNcrPage() {
  const [ncrs, setNcrs] = useState<ImsNcr[]>([]);
  const [filtered, setFiltered] = useState<ImsNcr[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [severityF, setSeverityF] = useState('all');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // Create dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'System', severity: 'Medium',
    deadline: '', assignedToId: '', rootCause: '', correctiveAction: '', preventiveAction: '',
  });

  // View/Edit dialog
  const [viewDialog, setViewDialog] = useState(false);
  const [selected, setSelected] = useState<ImsNcr | null>(null);
  const [editTab, setEditTab] = useState<'details' | 'capa' | 'trail'>('details');
  const [editForm, setEditForm] = useState({
    status: '', rootCause: '', correctiveAction: '', preventiveAction: '',
    caVerificationMethod: '', caEffectivenessRating: '', caResponsibleId: '', caTargetDate: '',
  });
  const [updating, setUpdating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchNcrs = useCallback(async () => {
    setLoading(true);
    const [ncrsRes, usersRes] = await Promise.all([fetch('/api/ims/ncr'), fetch('/api/users')]);
    if (ncrsRes.ok) setNcrs(await ncrsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchNcrs(); }, [fetchNcrs]);

  useEffect(() => {
    let f = [...ncrs];
    if (statusF !== 'all') f = f.filter(n => n.status === statusF);
    if (severityF !== 'all') f = f.filter(n => n.severity === severityF);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(n =>
        n.ncrNumber.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        (n.department ?? '').toLowerCase().includes(q) ||
        (n.auditNumber ?? '').toLowerCase().includes(q)
      );
    }
    setFiltered(f);
  }, [ncrs, statusF, severityF, search]);

  const stats = {
    total: ncrs.length,
    open: ncrs.filter(n => n.status === 'OPEN').length,
    inProgress: ncrs.filter(n => n.status === 'IN_PROGRESS').length,
    closed: ncrs.filter(n => n.status === 'CLOSED').length,
  };

  const createNcr = async () => {
    if (!form.title || !form.description || !form.deadline) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ims/ncr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          deadline: new Date(form.deadline).toISOString(),
          assignedToId: form.assignedToId || null,
          rootCause: form.rootCause || null,
          correctiveAction: form.correctiveAction || null,
          preventiveAction: form.preventiveAction || null,
        }),
      });
      if (res.ok) {
        setCreateDialog(false);
        setForm({ title: '', description: '', category: 'System', severity: 'Medium', deadline: '', assignedToId: '', rootCause: '', correctiveAction: '', preventiveAction: '' });
        fetchNcrs();
      }
    } finally {
      setSaving(false);
    }
  };

  const openView = (ncr: ImsNcr) => {
    setSelected(ncr);
    setEditForm({
      status: ncr.status,
      rootCause: ncr.rootCause ?? '',
      correctiveAction: ncr.correctiveAction ?? '',
      preventiveAction: ncr.preventiveAction ?? '',
      caVerificationMethod: ncr.caVerificationMethod ?? '',
      caEffectivenessRating: ncr.caEffectivenessRating ?? '',
      caResponsibleId: ncr.caResponsible?.id ?? '',
      caTargetDate: ncr.caTargetDate ? ncr.caTargetDate.split('T')[0] : '',
    });
    setEditTab('details');
    setViewDialog(true);
  };

  const updateNcr = async () => {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/ims/ncr/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          rootCause: editForm.rootCause || null,
          correctiveAction: editForm.correctiveAction || null,
          preventiveAction: editForm.preventiveAction || null,
          caVerificationMethod: editForm.caVerificationMethod || null,
          caEffectivenessRating: editForm.caEffectivenessRating || null,
          caResponsibleId: editForm.caResponsibleId || null,
          caTargetDate: editForm.caTargetDate ? new Date(editForm.caTargetDate).toISOString() : null,
        }),
      });
      if (res.ok) { setViewDialog(false); fetchNcrs(); }
    } finally {
      setUpdating(false);
    }
  };

  const deleteNcr = async (id: string) => {
    if (!confirm('Delete this NCR? This action cannot be undone.')) return;
    await fetch(`/api/ims/ncr/${id}`, { method: 'DELETE' });
    fetchNcrs();
  };

  const downloadPdf = async (ncr: ImsNcr) => {
    setExportingPdf(true);
    try {
      await generateQaNCRPDF(ncr);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-5 w-5 text-slate-300" />
              <span className="text-slate-300 text-xs font-semibold uppercase tracking-widest">IMS — Integrated Management System</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">QA NCR — Non-Product Nonconformance</h1>
            <p className="text-slate-300 mt-0.5 text-sm">Quality Assurance Nonconformance & CAPA Workflow Engine</p>
            <p className="text-slate-400/70 text-xs font-mono mt-1">
              HEXA-FRM-023 · Procedure: Hexa-ISP-005 · ISO §10.2 · System: IMS Module — QA NCR/CAPA Workflow Engine
            </p>
          </div>
          <Button
            className="bg-white text-[#2c3e50] hover:bg-slate-100 font-semibold shadow shrink-0"
            onClick={() => setCreateDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New QA NCR
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total,      icon: ClipboardX,   color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Open', value: stats.open,        icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock,  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
          { label: 'Closed', value: stats.closed,    icon: CheckCircle2, color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
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

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4" />Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search NCR number, title, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={statusF} onChange={e => setStatusF(e.target.value)} className="h-10 px-3 rounded-md border bg-background text-sm">
              <option value="all">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select value={severityF} onChange={e => setSeverityF(e.target.value)} className="h-10 px-3 rounded-md border bg-background text-sm">
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-slate-400" /><p className="text-slate-400 text-sm">Loading NCRs…</p></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center"><ShieldAlert className="h-10 w-10 mx-auto mb-3 text-slate-300" /><p className="text-slate-400 text-sm">No QA NCRs found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#2c3e50] text-white">
                    {['NCR No.', 'Title', 'Department / Audit', 'Category', 'Severity', 'Status', 'Deadline', 'Raised By', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(ncr => (
                    <tr key={ncr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-xs text-[#2c3e50] bg-[#2c3e50]/8 px-2 py-0.5 rounded">{ncr.ncrNumber}</span>
                        {ncr.auditFinding && (
                          <p className="text-xs text-slate-400 mt-0.5">From: {ncr.auditFinding.findingNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium text-slate-800 truncate">{ncr.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-600">{ncr.department ?? '—'}</p>
                        {ncr.auditNumber && <p className="text-xs text-slate-400">{ncr.auditNumber}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{ncr.category}</span>
                      </td>
                      <td className="px-4 py-3"><SeverityBadge s={ncr.severity} /></td>
                      <td className="px-4 py-3"><StatusBadge s={ncr.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {new Date(ncr.deadline).toLocaleDateString('en-SA-u-ca-gregory')}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{ncr.raisedBy.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => openView(ncr)}>
                            <Eye className="h-3 w-3" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 text-[#2c3e50]" onClick={() => downloadPdf(ncr)} disabled={exportingPdf}>
                            <FileDown className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteNcr(ncr.id)}>
                            <Trash2 className="h-3 w-3" />
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

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#2c3e50]" />
              New QA NCR — Non-Product Nonconformance
            </DialogTitle>
            <p className="text-xs text-slate-400 font-mono mt-0.5">HEXA-FRM-023 · Hexa-ISP-005 · ISO §10.2</p>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nonconformance title…" className="mt-1" />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the nonconformance…" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Low', 'Medium', 'High', 'Critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Deadline *</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Assigned To</Label>
                <Select value={form.assignedToId || '__none__'} onValueChange={v => setForm(f => ({ ...f, assignedToId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Root Cause (if known)</Label>
              <Textarea rows={2} value={form.rootCause} onChange={e => setForm(f => ({ ...f, rootCause: e.target.value }))} placeholder="Initial root cause analysis…" className="mt-1" />
            </div>
            <div>
              <Label>Corrective Action Required</Label>
              <Textarea rows={2} value={form.correctiveAction} onChange={e => setForm(f => ({ ...f, correctiveAction: e.target.value }))} placeholder="Corrective action to be taken…" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={createNcr} disabled={saving || !form.title || !form.description || !form.deadline} className="bg-[#2c3e50] hover:bg-[#34495e]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create QA NCR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View/Update Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-[#2c3e50]" />
                      {selected.ncrNumber}
                    </DialogTitle>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">HEXA-FRM-023 · Hexa-ISP-005</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" onClick={() => downloadPdf(selected)} disabled={exportingPdf}>
                    {exportingPdf ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                    Print PDF
                  </Button>
                </div>
                {/* Hero snippet */}
                <div className="rounded-lg bg-[#2c3e50]/5 border border-[#2c3e50]/10 p-3 mt-2">
                  <p className="font-semibold text-[#2c3e50]">{selected.title}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <StatusBadge s={selected.status} />
                    <SeverityBadge s={selected.severity} />
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{selected.category}</span>
                    {selected.department && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{selected.department}</span>}
                    {selected.auditNumber && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{selected.auditNumber}</span>}
                  </div>
                </div>
              </DialogHeader>

              {/* Tabs */}
              <div className="border-b flex gap-4 -mt-1">
                {(['details', 'capa', 'trail'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setEditTab(t)}
                    className={`pb-2 text-sm font-medium border-b-2 transition-colors ${editTab === t ? 'border-[#2c3e50] text-[#2c3e50]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                  >
                    {t === 'details' ? 'Details' : t === 'capa' ? 'CAPA' : <span className="flex items-center gap-1"><History className="w-3.5 h-3.5" />Audit Trail</span>}
                  </button>
                ))}
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1 py-1">
                {editTab === 'details' && (
                  <>
                    <div className="p-3 bg-slate-50 rounded-lg text-sm">
                      <p className="text-slate-500 text-xs mb-1">Description</p>
                      <p>{selected.description}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="CLOSED">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Root Cause Analysis</Label>
                      <Textarea rows={3} value={editForm.rootCause} onChange={e => setEditForm(f => ({ ...f, rootCause: e.target.value }))} placeholder="Root cause…" className="mt-1" />
                    </div>
                    <div>
                      <Label>Corrective Action</Label>
                      <Textarea rows={3} value={editForm.correctiveAction} onChange={e => setEditForm(f => ({ ...f, correctiveAction: e.target.value }))} placeholder="Corrective action taken…" className="mt-1" />
                    </div>
                    <div>
                      <Label>Preventive Action</Label>
                      <Textarea rows={2} value={editForm.preventiveAction} onChange={e => setEditForm(f => ({ ...f, preventiveAction: e.target.value }))} placeholder="Preventive measures…" className="mt-1" />
                    </div>
                  </>
                )}

                {editTab === 'capa' && (
                  <>
                    <div>
                      <Label>Verification Method</Label>
                      <Input value={editForm.caVerificationMethod} onChange={e => setEditForm(f => ({ ...f, caVerificationMethod: e.target.value }))} placeholder="e.g. Re-audit, review, test" className="mt-1" />
                    </div>
                    <div>
                      <Label>Effectiveness Rating</Label>
                      <Select value={editForm.caEffectivenessRating || '__none__'} onValueChange={v => setEditForm(f => ({ ...f, caEffectivenessRating: v === '__none__' ? '' : v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Not rated" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not rated</SelectItem>
                          <SelectItem value="EFFECTIVE">Effective</SelectItem>
                          <SelectItem value="PARTIALLY_EFFECTIVE">Partially Effective</SelectItem>
                          <SelectItem value="INEFFECTIVE">Ineffective</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CA Responsible</Label>
                        <Select value={editForm.caResponsibleId || '__none__'} onValueChange={v => setEditForm(f => ({ ...f, caResponsibleId: v === '__none__' ? '' : v }))}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— None —</SelectItem>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>CA Target Date</Label>
                        <Input type="date" value={editForm.caTargetDate} onChange={e => setEditForm(f => ({ ...f, caTargetDate: e.target.value }))} className="mt-1" />
                      </div>
                    </div>
                  </>
                )}

                {editTab === 'trail' && (
                  <ol className="relative border-l border-slate-200 ml-3 space-y-5">
                    <li className="ml-6">
                      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 ring-4 ring-white">
                        <AlertTriangle className="w-3 h-3 text-orange-600" />
                      </span>
                      <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">NCR Created — Open</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(selected.createdAt).toLocaleString('en-SA-u-ca-gregory')} · Raised by {selected.raisedBy.name}
                      </p>
                    </li>
                    {selected.status === 'IN_PROGRESS' || selected.status === 'CLOSED' ? (
                      <li className="ml-6">
                        <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                          <Clock className="w-3 h-3 text-blue-600" />
                        </span>
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">In Progress</p>
                        <p className="text-xs text-slate-500 mt-0.5">Investigation / CAPA underway</p>
                      </li>
                    ) : null}
                    {selected.status === 'CLOSED' && selected.closedAt ? (
                      <li className="ml-6">
                        <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 ring-4 ring-white">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        </span>
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Closed</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(selected.closedAt).toLocaleString('en-SA-u-ca-gregory')}
                          {selected.closedBy ? ` · Closed by ${selected.closedBy.name}` : ''}
                        </p>
                      </li>
                    ) : null}
                  </ol>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialog(false)}>Cancel</Button>
                {editTab !== 'trail' && (
                  <Button onClick={updateNcr} disabled={updating} className="bg-[#2c3e50] hover:bg-[#34495e]">
                    {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
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
