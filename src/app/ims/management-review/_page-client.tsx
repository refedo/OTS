'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ClipboardList, Plus, RefreshCw, Download, Loader2, ChevronRight,
  CheckCircle2, AlertTriangle, Lock, FileText, Zap,
} from 'lucide-react';

type Review = {
  id: string;
  reviewNumber: string;
  reviewDate: string;
  chairperson: string;
  status: string;
  period: string;
  approvedAt: string | null;
  inputNcrSummary: unknown;
  inputRiskSummary: unknown;
  inputAuditResults: unknown;
  inputLegalChanges: unknown;
  inputKpiStatus: unknown;
  inputResourceStatus: string | null;
  inputCustomerFeedback: string | null;
  outputDecisions: { decision: string; responsible: string; targetDate: string; status: string }[] | null;
  outputObjectives: string | null;
  outputResourceNeeds: string | null;
  attendees: { name: string; role: string; present: boolean }[] | null;
  notes: string | null;
};

const STATUS_CFG: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  DRAFT: { cls: 'bg-slate-100 text-slate-600', label: 'Draft', icon: <FileText className="w-3 h-3" /> },
  APPROVED: { cls: 'bg-green-100 text-green-700', label: 'Approved', icon: <CheckCircle2 className="w-3 h-3" /> },
  LOCKED: { cls: 'bg-blue-100 text-blue-700', label: 'Locked', icon: <Lock className="w-3 h-3" /> },
};

function statusBadge(s: string) {
  const c = STATUS_CFG[s] ?? { cls: 'bg-gray-100 text-gray-600', label: s, icon: null };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>{c.icon}{c.label}</span>;
}

export function ManagementReviewClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Review | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({ reviewDate: '', chairperson: 'CEO', period: '' });
  const [outputForm, setOutputForm] = useState({ outputObjectives: '', outputResourceNeeds: '', inputResourceStatus: '', inputCustomerFeedback: '', notes: '' });

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/ims/management-review');
    if (res.ok) setReviews(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const fetchDetail = async (id: string) => {
    const res = await fetch(`/api/ims/management-review/${id}`);
    if (res.ok) {
      const r = await res.json();
      setSelected(r);
      setOutputForm({
        outputObjectives: r.outputObjectives ?? '',
        outputResourceNeeds: r.outputResourceNeeds ?? '',
        inputResourceStatus: r.inputResourceStatus ?? '',
        inputCustomerFeedback: r.inputCustomerFeedback ?? '',
        notes: r.notes ?? '',
      });
    }
  };

  const createReview = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ims/management-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newForm, reviewDate: new Date(newForm.reviewDate).toISOString() }),
      });
      if (res.ok) { setCreateDialog(false); fetchReviews(); }
    } finally {
      setSaving(false);
    }
  };

  const populate = async () => {
    if (!selected) return;
    setPopulating(true);
    try {
      const res = await fetch(`/api/ims/management-review/${selected.id}/populate`, { method: 'POST' });
      if (res.ok) await fetchDetail(selected.id);
    } finally {
      setPopulating(false);
    }
  };

  const saveOutputs = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ims/management-review/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outputForm),
      });
      if (res.ok) await fetchDetail(selected.id);
    } finally {
      setSaving(false);
    }
  };

  const approveReview = async () => {
    if (!selected) return;
    const res = await fetch(`/api/ims/management-review/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    if (res.ok) { await fetchDetail(selected.id); await fetchReviews(); }
  };

  const printReview = () => { window.print(); };

  if (selected) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto print:p-2">
        {/* Back */}
        <div className="flex items-center justify-between print:hidden">
          <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Back to list
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={populate} disabled={populating || selected.status === 'LOCKED'}>
              {populating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              Populate from OTS
            </Button>
            <Button variant="outline" size="sm" onClick={printReview}><Download className="w-4 h-4 mr-1" />Print / PDF</Button>
            {selected.status === 'DRAFT' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={approveReview}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve Review
              </Button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-300 text-sm">Management Review Report</p>
              <h1 className="text-2xl font-bold">{selected.reviewNumber}</h1>
              <p className="text-slate-300">{selected.period} — {new Date(selected.reviewDate).toLocaleDateString('en-SA-u-ca-gregory')}</p>
              <p className="text-slate-400 text-sm mt-1">Chairperson: {selected.chairperson}</p>
            </div>
            {statusBadge(selected.status)}
          </div>
        </div>

        {/* ISO §9.3.2 Inputs */}
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-700">§9.3.2 — Review Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* NCR Summary */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">NCR Status Summary</p>
              {selected.inputNcrSummary ? (
                <div className="flex flex-wrap gap-2">
                  {(selected.inputNcrSummary as { status: string; count: number }[]).map?.((g) => (
                    <span key={g.status} className="text-xs bg-slate-100 px-2 py-1 rounded">{g.status}: {g.count}</span>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">Not populated yet — click "Populate from OTS"</p>}
            </div>
            {/* Risk Summary */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">High/Critical Risks</p>
              {selected.inputRiskSummary ? (
                <p className="text-xs text-slate-600">
                  {(selected.inputRiskSummary as { totalHighCritical: number }).totalHighCritical ?? 0} high/critical risks identified
                </p>
              ) : <p className="text-xs text-slate-400 italic">Not populated</p>}
            </div>
            {/* Legal Changes */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Legal & Regulatory Issues</p>
              {selected.inputLegalChanges && Array.isArray(selected.inputLegalChanges) && (selected.inputLegalChanges as unknown[]).length > 0 ? (
                <ul className="text-xs text-slate-600 space-y-1">
                  {(selected.inputLegalChanges as { referenceNumber: string; title: string; complianceStatus: string }[]).map(l => (
                    <li key={l.referenceNumber} className="flex gap-2">
                      <span className="font-mono">{l.referenceNumber}</span>
                      <span>{l.title}</span>
                      <span className="text-amber-600">({l.complianceStatus})</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-green-600">All legal obligations compliant ✓</p>}
            </div>
            {/* Open DCRs */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Audit / Change Request Results</p>
              {selected.inputAuditResults ? (
                <p className="text-xs text-slate-600">{(selected.inputAuditResults as { openDCRs: number }).openDCRs ?? 0} open document change requests pending</p>
              ) : <p className="text-xs text-slate-400 italic">Not populated</p>}
            </div>
            {/* Resource Status */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Resource Adequacy</p>
              <Textarea rows={2} value={outputForm.inputResourceStatus} onChange={e => setOutputForm(f => ({ ...f, inputResourceStatus: e.target.value }))} placeholder="Describe current resource status..." className="text-xs" disabled={selected.status === 'LOCKED'} />
            </div>
            {/* Customer Feedback */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Customer Feedback & Satisfaction</p>
              <Textarea rows={2} value={outputForm.inputCustomerFeedback} onChange={e => setOutputForm(f => ({ ...f, inputCustomerFeedback: e.target.value }))} placeholder="Summary of customer feedback..." className="text-xs" disabled={selected.status === 'LOCKED'} />
            </div>
          </CardContent>
        </Card>

        {/* ISO §9.3.3 Outputs */}
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-700">§9.3.3 — Review Outputs & Decisions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Improvement Decisions</p>
              <Textarea rows={4} value={outputForm.outputObjectives} onChange={e => setOutputForm(f => ({ ...f, outputObjectives: e.target.value }))} placeholder="Record decisions and opportunities for improvement..." disabled={selected.status === 'LOCKED'} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Resource Needs</p>
              <Textarea rows={3} value={outputForm.outputResourceNeeds} onChange={e => setOutputForm(f => ({ ...f, outputResourceNeeds: e.target.value }))} placeholder="Decisions on resource requirements..." disabled={selected.status === 'LOCKED'} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes / Minutes</p>
              <Textarea rows={3} value={outputForm.notes} onChange={e => setOutputForm(f => ({ ...f, notes: e.target.value }))} placeholder="Meeting notes..." disabled={selected.status === 'LOCKED'} />
            </div>
          </CardContent>
        </Card>

        {selected.status !== 'LOCKED' && (
          <div className="flex justify-end print:hidden">
            <Button onClick={saveOutputs} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Review
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-slate-300" />
          <div>
            <h1 className="text-2xl font-bold">Management Review</h1>
            <p className="text-slate-300 text-sm">ISO 9001 / 14001 / 45001 §9.3 — Executive quality management reviews</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReviews}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Button size="sm" onClick={() => setCreateDialog(true)} className="bg-slate-800 hover:bg-slate-700">
          <Plus className="w-4 h-4 mr-1" /> New Review
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Reviews', value: reviews.length, color: 'text-slate-700' },
          { label: 'Approved', value: reviews.filter(r => r.status === 'APPROVED' || r.status === 'LOCKED').length, color: 'text-green-600' },
          { label: 'Drafts', value: reviews.filter(r => r.status === 'DRAFT').length, color: 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border rounded-lg p-4">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Review #</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Chairperson</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                ) : reviews.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No reviews yet. Create the first management review.</td></tr>
                ) : reviews.map(r => (
                  <tr key={r.id} className="border-b hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => fetchDetail(r.id)}>
                    <td className="px-4 py-3 font-mono text-sm font-medium">{r.reviewNumber}</td>
                    <td className="px-4 py-3">{r.period}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.reviewDate).toLocaleDateString('en-SA-u-ca-gregory')}</td>
                    <td className="px-4 py-3">{r.chairperson}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-400 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Management Review</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Period *</Label>
              <Input value={newForm.period} onChange={e => setNewForm(f => ({ ...f, period: e.target.value }))} placeholder="e.g. Q1 2026 or Annual 2025" className="mt-1" />
            </div>
            <div>
              <Label>Review Date *</Label>
              <Input type="date" value={newForm.reviewDate} onChange={e => setNewForm(f => ({ ...f, reviewDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Chairperson</Label>
              <Input value={newForm.chairperson} onChange={e => setNewForm(f => ({ ...f, chairperson: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={createReview} disabled={saving || !newForm.period || !newForm.reviewDate}>
              {saving ? 'Creating...' : 'Create Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
