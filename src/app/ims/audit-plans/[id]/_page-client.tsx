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
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

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
  const [auditDialog, setAuditDialog] = useState(false);
  const [findingDialog, setFindingDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [auditForm, setAuditForm] = useState({
    scope: '', scheduledDate: '', auditorId: '', auditeeId: '',
  });
  const [findingForm, setFindingForm] = useState({
    type: 'NC' as 'NC' | 'OFI' | 'Observation',
    clause: '', description: '', evidence: '', correctiveAction: '',
    responsibleId: '', targetDate: '',
  });

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/ims/audit-plans/${planId}`);
    if (res.ok) setPlan(await res.json());
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
    setAuditDialog(true);
  };

  const openFindingDialog = async () => {
    if (!selectedAudit) return;
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setFindingForm({ type: 'NC', clause: '', description: '', evidence: '', correctiveAction: '', responsibleId: '', targetDate: '' });
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
          clause: findingForm.clause,
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

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;
  if (!plan) return <div className="p-6 text-slate-400">Plan not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Link href="/ims/audit-plans" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back to Audit Plans
      </Link>

      <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">{plan.planNumber}</h1>
        <p className="text-indigo-200">{plan.auditType} Audit Plan — {plan.year}</p>
        <span className="mt-2 inline-block text-xs bg-white/20 px-2 py-0.5 rounded">{plan.status}</span>
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
              <Label>Scope / Department *</Label>
              <Input value={auditForm.scope} onChange={e => setAuditForm(f => ({ ...f, scope: e.target.value }))} placeholder="e.g. Production / QC / HR" className="mt-1" />
            </div>
            <div>
              <Label>Scheduled Date *</Label>
              <Input type="date" value={auditForm.scheduledDate} onChange={e => setAuditForm(f => ({ ...f, scheduledDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Auditor</Label>
              <Select value={auditForm.auditorId} onValueChange={v => setAuditForm(f => ({ ...f, auditorId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select auditor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auditee</Label>
              <Select value={auditForm.auditeeId} onValueChange={v => setAuditForm(f => ({ ...f, auditeeId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select auditee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
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
          <DialogHeader><DialogTitle>Record Audit Finding</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
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
                <Label>ISO Clause *</Label>
                <Input value={findingForm.clause} onChange={e => setFindingForm(f => ({ ...f, clause: e.target.value }))} placeholder="e.g. 8.5.1" className="mt-1" />
              </div>
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
                <Select value={findingForm.responsibleId} onValueChange={v => setFindingForm(f => ({ ...f, responsibleId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— None —</SelectItem>
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
            <Button onClick={createFinding} disabled={saving || !findingForm.description || !findingForm.clause} className="bg-red-600 hover:bg-red-700">
              {saving ? 'Saving...' : 'Record Finding'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
