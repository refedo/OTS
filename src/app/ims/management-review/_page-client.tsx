'use client';

import { useState, useEffect, useCallback } from 'react';
import { IsoClauseNote } from '@/components/ims/IsoClauseNote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ClipboardList, Plus, RefreshCw, Download, Loader2, ChevronRight,
  CheckCircle2, AlertTriangle, Lock, FileText, Zap, UserCheck, Trash2,
} from 'lucide-react';

type Attendee = { name: string; role: string; present: boolean };

type AuditFinding = {
  findingNumber: string;
  type: string;
  clause: string | null;
  description: string;
  status: string;
  targetDate: string | null;
};

type Review = {
  id: string;
  reviewNumber: string;
  reviewDate: string;
  chairperson: string;
  status: string;
  period: string;
  approvedAt: string | null;
  attendees: Attendee[] | null;
  inputNcrSummary: unknown;
  inputRiskSummary: unknown;
  inputAuditResults: { openFindings?: AuditFinding[]; openDCRs?: number | null; note?: string } | null;
  inputLegalChanges: unknown;
  inputKpiStatus: unknown;
  inputObjectiveStatus: unknown;
  inputSupplierPerf: string | null;
  inputResourceStatus: string | null;
  inputCustomerFeedback: string | null;
  inputPreviousActions: { reviewNumber?: string; reviewDate?: string; decisions?: unknown; note?: string } | null;
  inputContextChanges: string | null;
  inputDesignPerformance: string | null;
  inputOhsPerformance: { byStatus?: { status: string; count: number }[]; note?: string } | null;
  inputEnvironmentalPerf: string | null;
  outputDecisions: { decision: string; responsible: string; targetDate: string; status: string }[] | null;
  outputObjectives: string | null;
  outputResourceNeeds: string | null;
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

const BLANK_ATTENDEE: Attendee = { name: '', role: '', present: true };

export function ManagementReviewClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Review | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({ reviewDate: '', chairperson: 'CEO', period: '' });
  const [outputForm, setOutputForm] = useState({
    outputObjectives: '',
    outputResourceNeeds: '',
    inputResourceStatus: '',
    inputCustomerFeedback: '',
    inputSupplierPerf: '',
    inputContextChanges: '',
    inputDesignPerformance: '',
    inputEnvironmentalPerf: '',
    notes: '',
  });
  const [attendeesForm, setAttendeesForm] = useState<Attendee[]>([]);

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
      const r: Review = await res.json();
      setSelected(r);
      setOutputForm({
        outputObjectives: r.outputObjectives ?? '',
        outputResourceNeeds: r.outputResourceNeeds ?? '',
        inputResourceStatus: r.inputResourceStatus ?? '',
        inputCustomerFeedback: r.inputCustomerFeedback ?? '',
        inputSupplierPerf: r.inputSupplierPerf ?? '',
        inputContextChanges: r.inputContextChanges ?? '',
        inputDesignPerformance: r.inputDesignPerformance ?? '',
        inputEnvironmentalPerf: r.inputEnvironmentalPerf ?? '',
        notes: r.notes ?? '',
      });
      setAttendeesForm(r.attendees ?? []);
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
        body: JSON.stringify({ ...outputForm, attendees: attendeesForm }),
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

  const addAttendee = () => setAttendeesForm((a: Attendee[]) => [...a, { ...BLANK_ATTENDEE }]);
  const removeAttendee = (i: number) => setAttendeesForm((a: Attendee[]) => a.filter((_: Attendee, idx: number) => idx !== i));
  const updateAttendee = (i: number, field: keyof Attendee, value: string | boolean) =>
    setAttendeesForm((a: Attendee[]) => a.map((att: Attendee, idx: number) => idx === i ? { ...att, [field]: value } : att));

  const isLocked = selected?.status === 'LOCKED';

  if (selected) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto print:p-2">
        {/* Back / Actions */}
        <div className="flex items-center justify-between print:hidden">
          <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Back to list
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={populate} disabled={populating || isLocked}>
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
              <p className="text-slate-500 text-xs font-mono mt-0.5">Form: HEXA-FRM-011 · Procedure: Hexa-ISP-003 · ISO §9.3</p>
            </div>
            {statusBadge(selected.status)}
          </div>
        </div>

        {/* Attendees — ISO §9.3.1 evidence */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              §9.3.1 — Attendees
              <span className="text-xs font-normal text-slate-400">(Top management participation evidence)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendeesForm.length === 0 ? (
              <p className="text-xs text-slate-400 italic mb-3">No attendees recorded yet.</p>
            ) : (
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-slate-500 uppercase tracking-wide">
                      <th className="py-2 pr-3 text-left font-medium">Name</th>
                      <th className="py-2 pr-3 text-left font-medium">Role / Title</th>
                      <th className="py-2 pr-3 text-center font-medium">Present</th>
                      {!isLocked && <th className="py-2 text-center font-medium"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {attendeesForm.map((att: Attendee, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">
                          {isLocked ? (
                            <span>{att.name}</span>
                          ) : (
                            <Input
                              value={att.name}
                              onChange={(e: { target: { value: string } }) => updateAttendee(i, 'name', e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Full name"
                            />
                          )}
                        </td>
                        <td className="py-1.5 pr-3">
                          {isLocked ? (
                            <span>{att.role}</span>
                          ) : (
                            <Input
                              value={att.role}
                              onChange={(e: { target: { value: string } }) => updateAttendee(i, 'role', e.target.value)}
                              className="h-7 text-xs"
                              placeholder="e.g. CEO, QMR"
                            />
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-center">
                          {isLocked ? (
                            <span className={att.present ? 'text-green-600' : 'text-slate-400'}>{att.present ? '✓' : '✗'}</span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={att.present}
                              onChange={(e: { target: { checked: boolean } }) => updateAttendee(i, 'present', e.target.checked)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          )}
                        </td>
                        {!isLocked && (
                          <td className="py-1.5 text-center">
                            <button onClick={() => removeAttendee(i)} className="text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!isLocked && (
              <Button variant="outline" size="sm" onClick={addAttendee} className="text-xs h-7">
                <Plus className="w-3 h-3 mr-1" /> Add Attendee
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ISO §9.3.2 Inputs */}
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-700">§9.3.2 — Review Inputs (12 ISO Items)</CardTitle></CardHeader>
          <CardContent className="space-y-5">

            {/* 1. Previous review actions */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">1.</span>Status of Actions from Previous Review
                <span className="ml-2 text-slate-400 font-normal normal-case">(auto-populated)</span>
              </p>
              {selected.inputPreviousActions ? (
                selected.inputPreviousActions.note ? (
                  <p className="text-xs text-slate-400 italic">{selected.inputPreviousActions.note}</p>
                ) : (
                  <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 space-y-1">
                    <p><span className="font-medium">Previous Review:</span> {selected.inputPreviousActions.reviewNumber} — {selected.inputPreviousActions.reviewDate ? new Date(selected.inputPreviousActions.reviewDate).toLocaleDateString('en-SA-u-ca-gregory') : '—'}</p>
                    {Array.isArray(selected.inputPreviousActions.decisions) && (selected.inputPreviousActions.decisions as { decision: string; status: string }[]).length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {(selected.inputPreviousActions.decisions as { decision: string; status: string }[]).map((d, i) => (
                          <li key={i} className="flex gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${d.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{d.status}</span>
                            <span>{d.decision}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-slate-400 italic">No decisions recorded in previous review.</p>}
                  </div>
                )
              ) : <p className="text-xs text-slate-400 italic">Not populated yet — click &quot;Populate from OTS&quot;</p>}
            </div>

            {/* 2. Context changes */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">2.</span>Changes in External &amp; Internal Context
              </p>
              <Textarea rows={2} value={outputForm.inputContextChanges} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, inputContextChanges: e.target.value }))} placeholder="Describe any significant changes in the organization's context, stakeholder needs, or strategic direction..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 3. NCR Summary */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">3.</span>IMS Performance: NCR Trends &amp; CA Closure
                <span className="ml-2 text-slate-400 font-normal normal-case">(auto-populated)</span>
              </p>
              {selected.inputNcrSummary ? (
                <div className="flex flex-wrap gap-2">
                  {(selected.inputNcrSummary as { status: string; count: number }[]).map?.((g) => (
                    <span key={g.status} className="text-xs bg-slate-100 px-2 py-1 rounded">{g.status}: {g.count}</span>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">Not populated yet</p>}
            </div>

            {/* 4. Design performance */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">4.</span>Design Performance: RFI Rate, Consultant Rejection Rate
              </p>
              <Textarea rows={2} value={outputForm.inputDesignPerformance} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, inputDesignPerformance: e.target.value }))} placeholder="Summarize design-stage performance: RFI frequency, drawing rejection rates, value engineering outcomes..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 5. KPI / Objectives */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">5.</span>IMS Objectives / KPI Status
                <span className="ml-2 text-slate-400 font-normal normal-case">(auto-populated)</span>
              </p>
              {selected.inputKpiStatus ? (
                <div className="text-xs text-slate-600 bg-slate-50 rounded p-2">
                  {(selected.inputKpiStatus as { kpis?: { name: string; target: number | null; unit: string | null }[]; note?: string }).kpis?.slice(0, 5).map((k, i) => (
                    <div key={i} className="flex justify-between py-0.5">
                      <span>{k.name}</span>
                      <span className="text-slate-400">{k.target !== null ? `Target: ${k.target} ${k.unit ?? ''}` : 'No target set'}</span>
                    </div>
                  ))}
                  {((selected.inputKpiStatus as { kpis?: unknown[] }).kpis?.length ?? 0) > 5 && (
                    <p className="text-slate-400 italic mt-1">+ {((selected.inputKpiStatus as { kpis?: unknown[] }).kpis?.length ?? 0) - 5} more — see Business Planning module</p>
                  )}
                </div>
              ) : <p className="text-xs text-slate-400 italic">Not populated yet</p>}
            </div>

            {/* 6. Audit findings */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">6.</span>Internal &amp; External Audit Findings
                <span className="ml-2 text-slate-400 font-normal normal-case">(auto-populated)</span>
              </p>
              {selected.inputAuditResults ? (
                <div className="text-xs text-slate-600 space-y-1">
                  {(selected.inputAuditResults.openFindings ?? []).length > 0 ? (
                    <div className="space-y-1">
                      {(selected.inputAuditResults.openFindings ?? []).slice(0, 5).map((f: AuditFinding) => (
                        <div key={f.findingNumber} className="flex gap-2 items-start bg-slate-50 rounded p-1.5">
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">{f.findingNumber}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${f.type === 'NC' ? 'bg-red-100 text-red-700' : f.type === 'OBS' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{f.type}</span>
                          <span className="line-clamp-1">{f.description}</span>
                        </div>
                      ))}
                      {(selected.inputAuditResults.openFindings ?? []).length > 5 && (
                        <p className="text-slate-400 italic">+ {(selected.inputAuditResults.openFindings ?? []).length - 5} more open findings</p>
                      )}
                    </div>
                  ) : <p className="text-green-600">No open audit findings ✓</p>}
                  {selected.inputAuditResults.openDCRs !== null && (
                    <p className="text-slate-500">{selected.inputAuditResults.openDCRs} open document change requests pending</p>
                  )}
                </div>
              ) : <p className="text-xs text-slate-400 italic">Not populated yet</p>}
            </div>

            {/* 7. Customer feedback */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">7.</span>Customer Satisfaction &amp; Feedback
              </p>
              <Textarea rows={2} value={outputForm.inputCustomerFeedback} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, inputCustomerFeedback: e.target.value }))} placeholder="Summary of customer feedback, complaints, satisfaction scores, 9COM communications..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 8. Supplier performance */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">8.</span>Supplier &amp; External Provider Performance
              </p>
              <Textarea rows={2} value={outputForm.inputSupplierPerf} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, inputSupplierPerf: e.target.value }))} placeholder="Assessment of key suppliers and subcontractors — on-time delivery, quality rejections, MIR acceptance rates..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 9. Resource adequacy */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">9.</span>Adequacy of Resources
              </p>
              <Textarea rows={2} value={outputForm.inputResourceStatus} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, inputResourceStatus: e.target.value }))} placeholder="Staffing levels, equipment adequacy, training coverage, calibration status, infrastructure..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 10. OH&S performance */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">10.</span>OH&amp;S Incident Rate &amp; Near-Miss Trends
                <span className="ml-2 text-slate-400 font-normal normal-case">(auto-populated)</span>
              </p>
              {selected.inputOhsPerformance ? (
                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex flex-wrap gap-2">
                    {(selected.inputOhsPerformance.byStatus ?? []).map((s: { status: string; count: number }) => (
                      <span key={s.status} className="text-xs bg-slate-100 px-2 py-1 rounded">{s.status}: {s.count}</span>
                    ))}
                  </div>
                  {selected.inputOhsPerformance.note && <p className="text-slate-400 italic">{selected.inputOhsPerformance.note}</p>}
                </div>
              ) : <p className="text-xs text-slate-400 italic">Not populated yet</p>}
            </div>

            {/* 11. Environmental performance */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">11.</span>Environmental Performance (ISO 14001)
              </p>
              <Textarea rows={2} value={outputForm.inputEnvironmentalPerf} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, inputEnvironmentalPerf: e.target.value }))} placeholder="Waste management, energy consumption, environmental objectives progress, significant aspects..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 12. Continual improvement note */}
            <div className="bg-slate-50 rounded p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                <span className="text-slate-400 mr-1">12.</span>Opportunities for Continual Improvement
              </p>
              <p className="text-xs text-slate-400 italic">Improvement opportunities and decisions are recorded in the §9.3.3 Outputs section below.</p>
            </div>

          </CardContent>
        </Card>

        {/* ISO §9.3.3 Outputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">§9.3.3 — Review Outputs &amp; Decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400 italic -mt-1">Opportunities for continual improvement (§9.3.2 item 12) are recorded here as formal decisions.</p>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Improvement Decisions</p>
              <Textarea rows={4} value={outputForm.outputObjectives} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, outputObjectives: e.target.value }))} placeholder="Record decisions, assigned owners, target dates, and measurable objectives for improvement..." disabled={isLocked} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Resource Needs</p>
              <Textarea rows={3} value={outputForm.outputResourceNeeds} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, outputResourceNeeds: e.target.value }))} placeholder="Decisions on resource requirements — personnel, equipment, training, infrastructure..." disabled={isLocked} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes / Minutes</p>
              <Textarea rows={3} value={outputForm.notes} onChange={(e: { target: { value: string } }) => setOutputForm((f: typeof outputForm) => ({ ...f, notes: e.target.value }))} placeholder="Meeting notes, discussion points, action items..." disabled={isLocked} />
            </div>
          </CardContent>
        </Card>

        {!isLocked && (
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
            <p className="text-slate-500 text-xs font-mono mt-0.5">Form: HEXA-FRM-011, HEXA-FRM-012 · Procedure: Hexa-ISP-003</p>
          </div>
        </div>
      </div>

      <IsoClauseNote
        storageKey="ims-management-review"
        clauses={[
          { standard: 'ISO 9001:2015', clause: '§9.3', title: 'Management review' },
          { standard: 'ISO 14001:2015', clause: '§9.3', title: 'Management review' },
          { standard: 'ISO 45001:2018', clause: '§9.3', title: 'Management review' },
        ]}
      />

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
          { label: 'Approved', value: reviews.filter((r: Review) => r.status === 'APPROVED' || r.status === 'LOCKED').length, color: 'text-green-600' },
          { label: 'Drafts', value: reviews.filter((r: Review) => r.status === 'DRAFT').length, color: 'text-amber-600' },
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
                ) : reviews.map((r: Review) => (
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
              <Input value={newForm.period} onChange={(e: { target: { value: string } }) => setNewForm((f: typeof newForm) => ({ ...f, period: e.target.value }))} placeholder="e.g. Q1 2026 or Annual 2025" className="mt-1" />
            </div>
            <div>
              <Label>Review Date *</Label>
              <Input type="date" value={newForm.reviewDate} onChange={(e: { target: { value: string } }) => setNewForm((f: typeof newForm) => ({ ...f, reviewDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Chairperson</Label>
              <Input value={newForm.chairperson} onChange={(e: { target: { value: string } }) => setNewForm((f: typeof newForm) => ({ ...f, chairperson: e.target.value }))} className="mt-1" />
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
