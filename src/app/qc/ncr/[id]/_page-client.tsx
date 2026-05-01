'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock, PlayCircle,
  Save, Loader2, ClipboardCheck,
} from 'lucide-react';
import Link from 'next/link';

type NCR = {
  id: string;
  ncrNumber: string;
  description: string;
  correctiveAction: string | null;
  rootCause: string | null;
  deadline: string;
  closedDate: string | null;
  status: string;
  severity: string;
  project: { projectNumber: string; name: string };
  building: { designation: string; name: string } | null;
  raisedBy: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  caRequired: boolean;
  caRootCause: string | null;
  caAction: string | null;
  caVerificationMethod: string | null;
  caEffectivenessRating: string | null;
  caClosedAt: string | null;
  caResponsibleId: string | null;
  caTargetDate: string | null;
  caWorkflowInstanceId: string | null;
  caResponsible: { id: string; name: string } | null;
  workflowInstance: WorkflowInstanceData | null;
};

type WorkflowInstanceData = {
  id: string;
  status: string;
  entityType: string;
  entityId: string;
  definition: { key: string; name: string };
  initiatedBy: { id: string; name: string };
  createdAt: string;
  completedAt: string | null;
  stepInstances: StepInstance[];
};

type StepInstance = {
  id: string;
  sequence: number;
  status: string;
  resolvedApprovers: { userId: string; name: string; email: string }[] | null;
  requiredApprovals: number;
  receivedApprovals: number;
  skipReason: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  step: { name: string; sequence: number; slaHours: number | null; onRejectBehavior: string };
  approvals: { id: string; decision: string; comment: string | null; user: { id: string; name: string; email: string }; createdAt: string }[];
};

const SEVERITY_COLORS: Record<string, string> = {
  Low: 'bg-blue-100 text-blue-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-red-100 text-red-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  Closed: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-200 text-red-800',
};

type Tab = 'overview' | 'corrective-action';

export function NcrDetailClient({ ncrId }: { ncrId: string }) {
  const router = useRouter();
  const [ncr, setNcr] = useState<NCR | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [startingWf, setStartingWf] = useState(false);

  const [caForm, setCaForm] = useState({
    caRequired: false,
    caRootCause: '',
    caAction: '',
    caVerificationMethod: '',
    caEffectivenessRating: '',
    caResponsibleId: '',
    caTargetDate: '',
  });

  const fetchNcr = useCallback(async () => {
    setLoading(true);
    try {
      const [ncrRes, caRes, usersRes] = await Promise.all([
        fetch(`/api/qc/ncr/${ncrId}`),
        fetch(`/api/qc/ncr/${ncrId}/ca`),
        fetch('/api/users'),
      ]);
      if (!ncrRes.ok) { router.push('/qc/ncr'); return; }
      const ncrData = await ncrRes.json();
      const caData = caRes.ok ? await caRes.json() : {};
      const merged: NCR = { ...ncrData, ...caData };
      setNcr(merged);
      setCaForm({
        caRequired: merged.caRequired ?? false,
        caRootCause: merged.caRootCause ?? '',
        caAction: merged.caAction ?? '',
        caVerificationMethod: merged.caVerificationMethod ?? '',
        caEffectivenessRating: merged.caEffectivenessRating ?? '',
        caResponsibleId: merged.caResponsibleId ?? '',
        caTargetDate: merged.caTargetDate ? merged.caTargetDate.split('T')[0] : '',
      });
      if (usersRes.ok) setUsers(await usersRes.json());
    } finally {
      setLoading(false);
    }
  }, [ncrId, router]);

  useEffect(() => { fetchNcr(); }, [fetchNcr]);

  const saveCA = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/qc/ncr/${ncrId}/ca`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...caForm,
          caEffectivenessRating: caForm.caEffectivenessRating || null,
          caResponsibleId: caForm.caResponsibleId || null,
          caTargetDate: caForm.caTargetDate ? new Date(caForm.caTargetDate).toISOString() : null,
        }),
      });
      if (res.ok) await fetchNcr();
    } finally {
      setSaving(false);
    }
  };

  const startWorkflow = async () => {
    setStartingWf(true);
    try {
      const res = await fetch(`/api/qc/ncr/${ncrId}/ca/start-workflow`, { method: 'POST' });
      if (res.ok) await fetchNcr();
      else {
        const err = await res.json();
        alert(err.error ?? 'Failed to start workflow');
      }
    } finally {
      setStartingWf(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );
  if (!ncr) return null;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <Link href="/qc/ncr" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="w-4 h-4" /> Back to NCR List
      </Link>

      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-red-100 text-sm font-medium uppercase tracking-wide">Non-Conformance Report</p>
            <h1 className="text-2xl font-bold mt-1">{ncr.ncrNumber}</h1>
            <p className="text-red-100 mt-1">{ncr.project.name} — {ncr.building?.name ?? 'General'}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${SEVERITY_COLORS[ncr.severity] ?? 'bg-gray-100 text-gray-700'}`}>{ncr.severity}</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[ncr.status] ?? 'bg-gray-100 text-gray-700'}`}>{ncr.status}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-6">
        {(['overview', 'corrective-action'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'overview' ? 'Overview' : 'Corrective Action'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">NCR Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><p className="text-slate-500">Description</p><p className="font-medium">{ncr.description}</p></div>
              {ncr.rootCause && <div><p className="text-slate-500">Root Cause</p><p className="font-medium">{ncr.rootCause}</p></div>}
              {ncr.correctiveAction && <div><p className="text-slate-500">Corrective Action</p><p className="font-medium">{ncr.correctiveAction}</p></div>}
              <div><p className="text-slate-500">Deadline</p><p className="font-medium">{new Date(ncr.deadline).toLocaleDateString('en-SA-u-ca-gregory')}</p></div>
              {ncr.closedDate && <div><p className="text-slate-500">Closed</p><p className="font-medium">{new Date(ncr.closedDate).toLocaleDateString('en-SA-u-ca-gregory')}</p></div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><p className="text-slate-500">Raised By</p><p className="font-medium">{ncr.raisedBy.name}</p></div>
              {ncr.assignedTo && <div><p className="text-slate-500">Assigned To</p><p className="font-medium">{ncr.assignedTo.name}</p></div>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'corrective-action' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-orange-600" />
                Corrective Action (ISO §10.2)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="caRequired"
                  checked={caForm.caRequired}
                  onChange={e => setCaForm(f => ({ ...f, caRequired: e.target.checked }))}
                  className="w-4 h-4 accent-orange-600"
                />
                <Label htmlFor="caRequired">Corrective action required for this NCR</Label>
              </div>

              {caForm.caRequired && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Root Cause Analysis</Label>
                    <Textarea rows={3} value={caForm.caRootCause} onChange={e => setCaForm(f => ({ ...f, caRootCause: e.target.value }))} placeholder="Describe the root cause..." className="mt-1" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Corrective Action</Label>
                    <Textarea rows={3} value={caForm.caAction} onChange={e => setCaForm(f => ({ ...f, caAction: e.target.value }))} placeholder="Describe the corrective action taken..." className="mt-1" />
                  </div>
                  <div>
                    <Label>Verification Method</Label>
                    <Input value={caForm.caVerificationMethod} onChange={e => setCaForm(f => ({ ...f, caVerificationMethod: e.target.value }))} placeholder="e.g. Re-inspection, audit, test" className="mt-1" />
                  </div>
                  <div>
                    <Label>Effectiveness Rating</Label>
                    <Select value={caForm.caEffectivenessRating} onValueChange={v => setCaForm(f => ({ ...f, caEffectivenessRating: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Not rated yet" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EFFECTIVE">Effective</SelectItem>
                        <SelectItem value="PARTIALLY_EFFECTIVE">Partially Effective</SelectItem>
                        <SelectItem value="INEFFECTIVE">Ineffective</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Responsible Person</Label>
                    <Select value={caForm.caResponsibleId} onValueChange={v => setCaForm(f => ({ ...f, caResponsibleId: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target Date</Label>
                    <Input type="date" value={caForm.caTargetDate} onChange={e => setCaForm(f => ({ ...f, caTargetDate: e.target.value }))} className="mt-1" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={saveCA} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save CA Details
                </Button>
                {caForm.caRequired && !ncr.caWorkflowInstanceId && (
                  <Button variant="outline" onClick={startWorkflow} disabled={startingWf}>
                    {startingWf ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                    Start CA Workflow
                  </Button>
                )}
              </div>

              {ncr.caClosedAt && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    CA closed on {new Date(ncr.caClosedAt).toLocaleDateString('en-SA-u-ca-gregory')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Timeline */}
          {ncr.workflowInstance && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" /> CA Workflow Progress</CardTitle></CardHeader>
              <CardContent>
                <WorkflowTimeline instance={ncr.workflowInstance} />
              </CardContent>
            </Card>
          )}

          {!ncr.workflowInstance && !ncr.caWorkflowInstanceId && ncr.caRequired && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">CA workflow not started. Save CA details and click "Start CA Workflow" to begin the 3-step approval process.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
