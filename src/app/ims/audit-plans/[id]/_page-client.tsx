'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2, FileDown, Search } from 'lucide-react';
import { generateAuditPlanPDF, type AuditPlanPDFData } from '@/lib/ims-pdf-generator';

type Audit = {
  id: string;
  auditNumber: string;
  scope: string;
  scheduledDate: string;
  actualDate: string | null;
  status: string;
  auditor: { id: string; name: string } | null;
  auditee: { id: string; name: string } | null;
  _count: { findings: number };
};

type Finding = {
  id: string;
  findingNumber: string;
  type: string;
  clause: string;
  description: string;
  status: string;
  targetDate: string | null;
  closedAt: string | null;
  responsible: { id: string; name: string } | null;
};

type PlanDetail = {
  id: string;
  planNumber: string;
  year: number;
  auditType: string;
  status: string;
  audits: Audit[];
};

const FINDING_TYPE_CFG: Record<string, string> = {
  NC: 'bg-red-100 text-red-700',
  OFI: 'bg-blue-100 text-blue-700',
  Observation: 'bg-slate-100 text-slate-600',
};

const FINDING_STATUS_CFG: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-200 text-red-800 font-semibold',
};

export function AuditPlanDetailClient({ planId }: { planId: string }) {
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [auditDialog, setAuditDialog] = useState(false);
  const [findingDialog, setFindingDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [auditorSearch, setAuditorSearch] = useState('');
  const [auditeeSearch, setAuditeeSearch] = useState('');

  const [auditForm, setAuditForm] = useState({
    scope: '', scheduledDate: '', auditorId: '', auditeeId: '',
  });
  const [findingForm, setFindingForm] = useState({
    type: 'NC' as 'NC' | 'OFI' | 'Observation',
    description: '', evidence: '', correctiveAction: '',
    responsibleId: '', targetDate: '',
  });

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    const [planRes, deptsRes] = await Promise.all([
      fetch(`/api/ims/audit-plans/${planId}`),
      fetch('/api/departments'),
    ]);
    if (planRes.ok) setPlan(await planRes.json());
    if (deptsRes.ok) setDepartments(await deptsRes.json());
    setLoading(false);
  }, [planId]);

  const fetchFindings = useCallback(async (auditId: string) => {
    const res = await fetch(`/api/ims/audit-findings?auditId=${auditId}`);
    if (res.ok) setFindings(await res.json());
  }, []);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const openAuditDialog = async () => {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setAuditForm({ scope: '', scheduledDate: '', auditorId: '', auditeeId: '' });
    setAuditorSearch('');
    setAuditeeSearch('');
    setAuditDialog(true);
  };

  const openFindingDialog = async () => {
    if (!selectedAudit) return;
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setFindingForm({ type: 'NC', description: '', evidence: '', correctiveAction: '', responsibleId: '', targetDate: '' });
    setFindingDialog(true);
  };

  const createAudit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ims/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          scope: auditForm.scope,
          scheduledDate: new Date(auditForm.scheduledDate).toISOString(),
          auditorId: auditForm.auditorId || null,
          auditeeId: auditForm.auditeeId || null,
        }),
      });
      if (res.ok) { setAuditDialog(false); fetchPlan(); }
    } finally {
      setSaving(false);
    }
  };

  const createFinding = async () => {
    if (!selectedAudit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ims/audit-findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId: selectedAudit.id,
          type: findingForm.type,
          description: findingForm.description,
          evidence: findingForm.evidence || null,
          correctiveAction: findingForm.correctiveAction || null,
          responsibleId: findingForm.responsibleId || null,
          targetDate: findingForm.targetDate ? new Date(findingForm.targetDate).toISOString() : null,
        }),
      });
      if (res.ok) { setFindingDialog(false); fetchFindings(selectedAudit.id); }
    } finally {
      setSaving(false);
    }
  };

  const selectAudit = (audit: Audit) => {
    setSelectedAudit(audit);
    fetchFindings(audit.id);
  };

  const closeFinding = async (findingId: string) => {
    await fetch(`/api/ims/audit-findings/${findingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLOSED', closedAt: new Date().toISOString() }),
    });
    if (selectedAudit) fetchFindings(selectedAudit.id);
  };

  const downloadPDF = async () => {
    if (!plan) return;
    setDownloading(true);
    try {
      const allFindings: Record<string, Finding[]> = {};
      for (const a of plan.audits) {
        const fr = await fetch(`/api/ims/audit-findings?auditId=${a.id}`);
        allFindings[a.id] = fr.ok ? await fr.json() : [];
      }
      const pdfData: AuditPlanPDFData = {
        planNumber: plan.planNumber,
        year: plan.year,
        auditType: plan.auditType,
        status: plan.status,
        audits: plan.audits.map(a => ({
          auditNumber: a.auditNumber,
          scope: a.scope,
          scheduledDate: a.scheduledDate,
          actualDate: a.actualDate,
          status: a.status,
          auditor: a.auditor?.name ?? null,
          auditee: a.auditee?.name ?? null,
          findings: allFindings[a.id] ?? [],
        })),
      };
      await generateAuditPlanPDF(pdfData);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;
  if (!plan) return <div className="p-6 text-slate-400">Plan not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/ims/audit-plans" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#2c3e50] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Audit Plans
        </Link>
        <Button
          size="sm" variant="outline"
          className="gap-1.5 text-xs border-[#2c3e50]/30 text-[#2c3e50] hover:bg-[#2c3e50] hover:text-white transition-colors"
          onClick={downloadPDF}
          disabled={downloading}
        >
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          Download PDF
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">{plan.planNumber}</h1>
          <p className="text-slate-300 mt-0.5">{plan.auditType} Audit Plan — {plan.year}</p>
          <span className="mt-2 inline-block text-xs bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">{plan.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audits List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">Scheduled Audits ({plan.audits.length})</CardTitle>
            <Button size="sm" onClick={openAuditDialog} className="bg-indigo-700 hover:bg-indigo-800">
              <Plus className="w-3 h-3 mr-1" /> Add Audit
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.audits.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No audits scheduled yet.</p>
            ) : plan.audits.map(a => (
              <div
                key={a.id}
                onClick={() => selectAudit(a)}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${selectedAudit?.id === a.id ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{a.auditNumber}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${FINDING_STATUS_CFG[a.status] ?? 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{a.scope}</p>
                <div className="flex gap-3 text-xs text-slate-400 mt-1">
                  <span>{new Date(a.scheduledDate).toLocaleDateString('en-SA-u-ca-gregory')}</span>
                  <span>{a._count.findings} findings</span>
                  {a.auditor && <span>Auditor: {a.auditor.name}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Findings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">
              {selectedAudit ? `Findings — ${selectedAudit.auditNumber}` : 'Select an audit'}
            </CardTitle>
            {selectedAudit && (
              <Button size="sm" onClick={openFindingDialog} className="bg-red-600 hover:bg-red-700">
                <Plus className="w-3 h-3 mr-1" /> Add Finding
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {!selectedAudit ? (
              <p className="text-sm text-slate-400 text-center py-4">Click an audit to view findings.</p>
            ) : findings.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No findings for this audit.</p>
            ) : findings.map(f => (
              <div key={f.id} className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${FINDING_TYPE_CFG[f.type] ?? ''}`}>{f.type}</span>
                    <span className="font-mono text-xs text-slate-500">{f.findingNumber}</span>
                    <span className="text-xs text-slate-500">Cl. {f.clause}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${FINDING_STATUS_CFG[f.status] ?? 'bg-gray-100 text-gray-600'}`}>{f.status}</span>
                </div>
                <p className="text-sm text-slate-700">{f.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    {f.responsible && <span>Responsible: {f.responsible.name}</span>}
                    {f.targetDate && <span className="ml-2">Due: {new Date(f.targetDate).toLocaleDateString('en-SA-u-ca-gregory')}</span>}
                  </div>
                  {f.status !== 'CLOSED' && (
                    <Button size="sm" variant="ghost" className="text-green-600 h-6 px-2 text-xs" onClick={() => closeFinding(f.id)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Close
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Add Audit Dialog */}
      <Dialog open={auditDialog} onOpenChange={setAuditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Audit</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Department *</Label>
              <Select value={auditForm.scope || '__none__'} onValueChange={v => setAuditForm(f => ({ ...f, scope: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select department…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select Department —</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scheduled Date *</Label>
              <Input type="date" value={auditForm.scheduledDate} onChange={e => setAuditForm(f => ({ ...f, scheduledDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Auditor</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search auditor…"
                  value={auditorSearch}
                  onChange={e => setAuditorSearch(e.target.value)}
                  className="pl-8 mb-1"
                />
              </div>
              <Select value={auditForm.auditorId || '__none__'} onValueChange={v => setAuditForm(f => ({ ...f, auditorId: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select auditor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {users.filter(u => !auditorSearch || u.name.toLowerCase().includes(auditorSearch.toLowerCase())).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auditee</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search auditee…"
                  value={auditeeSearch}
                  onChange={e => setAuditeeSearch(e.target.value)}
                  className="pl-8 mb-1"
                />
              </div>
              <Select value={auditForm.auditeeId || '__none__'} onValueChange={v => setAuditForm(f => ({ ...f, auditeeId: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select auditee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {users.filter(u => !auditeeSearch || u.name.toLowerCase().includes(auditeeSearch.toLowerCase())).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditDialog(false)}>Cancel</Button>
            <Button onClick={createAudit} disabled={saving || !auditForm.scope || !auditForm.scheduledDate} className="bg-indigo-700 hover:bg-indigo-800">
              {saving ? 'Scheduling...' : 'Schedule Audit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Finding Dialog */}
      <Dialog open={findingDialog} onOpenChange={setFindingDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record Audit Finding</DialogTitle>
            {selectedAudit && (
              <div className="mt-1.5 flex gap-2 flex-wrap">
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono">{selectedAudit.auditNumber}</span>
                {selectedAudit.scope && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{selectedAudit.scope}</span>}
              </div>
            )}
            {findingForm.type === 'NC' && (
              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-100 rounded px-2 py-1 mt-1">
                ⚠ NC type will automatically create a QA NCR in the IMS NCR register (HEXA-FRM-023)
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type *</Label>
              <Select value={findingForm.type} onValueChange={v => setFindingForm(f => ({ ...f, type: v as typeof f.type }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NC">NC (Non-Conformance)</SelectItem>
                  <SelectItem value="OFI">OFI (Opportunity for Improvement)</SelectItem>
                  <SelectItem value="Observation">Observation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea rows={3} value={findingForm.description} onChange={e => setFindingForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the finding..." className="mt-1" />
            </div>
            <div>
              <Label>Objective Evidence</Label>
              <Textarea rows={2} value={findingForm.evidence} onChange={e => setFindingForm(f => ({ ...f, evidence: e.target.value }))} placeholder="Evidence observed..." className="mt-1" />
            </div>
            <div>
              <Label>Corrective Action Required</Label>
              <Textarea rows={2} value={findingForm.correctiveAction} onChange={e => setFindingForm(f => ({ ...f, correctiveAction: e.target.value }))} placeholder="Required corrective action..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Responsible</Label>
                <Select value={findingForm.responsibleId || '__none__'} onValueChange={v => setFindingForm(f => ({ ...f, responsibleId: v === '__none__' ? '' : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Date</Label>
                <Input type="date" value={findingForm.targetDate} onChange={e => setFindingForm(f => ({ ...f, targetDate: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFindingDialog(false)}>Cancel</Button>
            <Button onClick={createFinding} disabled={saving || !findingForm.description} className="bg-red-600 hover:bg-red-700">
              {saving ? 'Saving...' : 'Record Finding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
