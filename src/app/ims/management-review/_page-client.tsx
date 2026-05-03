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
  CheckCircle2, AlertTriangle, Lock, FileText, Zap, UserCheck, Trash2, FileDown,
  MessageSquarePlus, FileSpreadsheet,
} from 'lucide-react';
import { generateManagementReviewMOMPDF, generateManagementReviewReportPDF } from '@/lib/ims-pdf-generator';

type Attendee = { name: string; role: string; present: boolean };

type AuditFinding = {
  findingNumber: string;
  type: string;
  clause: string | null;
  description: string;
  status: string;
  targetDate: string | null;
};

type AdditionalItem = { question: string; answer: string };

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
  inputSalesOrderIntake: string | null;
  inputProjectDelivery: string | null;
  inputProductionTonnage: string | null;
  inputProcurementDelays: string | null;
  inputRisksOpportunities: string | null;
  inputAdditionalItems: AdditionalItem[] | null;
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
const BLANK_ITEM: AdditionalItem = { question: '', answer: '' };

// Reserved keys for notes attached to auto-populated sections
const AUTO_NOTE_KEYS = {
  prevActions: '__NOTES_PREV__',
  ncr: '__NOTES_NCR__',
  audit: '__NOTES_AUDIT__',
  kpi: '__NOTES_KPI__',
  ohs: '__NOTES_OHS__',
} as const;

type AutoNotes = { prevActions: string; ncr: string; audit: string; kpi: string; ohs: string };

type OutputForm = {
  outputObjectives: string;
  outputResourceNeeds: string;
  inputResourceStatus: string;
  inputCustomerFeedback: string;
  inputSupplierPerf: string;
  inputContextChanges: string;
  inputDesignPerformance: string;
  inputEnvironmentalPerf: string;
  inputSalesOrderIntake: string;
  inputProjectDelivery: string;
  inputProductionTonnage: string;
  inputProcurementDelays: string;
  inputRisksOpportunities: string;
  notes: string;
};

export function ManagementReviewClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Review | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({ reviewDate: '', chairperson: 'CEO', period: '' });
  const [outputForm, setOutputForm] = useState<OutputForm>({
    outputObjectives: '',
    outputResourceNeeds: '',
    inputResourceStatus: '',
    inputCustomerFeedback: '',
    inputSupplierPerf: '',
    inputContextChanges: '',
    inputDesignPerformance: '',
    inputEnvironmentalPerf: '',
    inputSalesOrderIntake: '',
    inputProjectDelivery: '',
    inputProductionTonnage: '',
    inputProcurementDelays: '',
    inputRisksOpportunities: '',
    notes: '',
  });
  const [attendeesForm, setAttendeesForm] = useState<Attendee[]>([]);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);
  const [autoNotes, setAutoNotes] = useState<AutoNotes>({ prevActions: '', ncr: '', audit: '', kpi: '', ohs: '' });
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  const [deletingReview, setDeletingReview] = useState<string | null>(null);

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
        inputSalesOrderIntake: r.inputSalesOrderIntake ?? '',
        inputProjectDelivery: r.inputProjectDelivery ?? '',
        inputProductionTonnage: r.inputProductionTonnage ?? '',
        inputProcurementDelays: r.inputProcurementDelays ?? '',
        inputRisksOpportunities: r.inputRisksOpportunities ?? '',
        notes: r.notes ?? '',
      });
      setAttendeesForm(r.attendees ?? []);
      const allItems: AdditionalItem[] = r.inputAdditionalItems ?? [];
      const findNote = (key: string) => allItems.find(i => i.question === key)?.answer ?? '';
      setAutoNotes({
        prevActions: findNote(AUTO_NOTE_KEYS.prevActions),
        ncr: findNote(AUTO_NOTE_KEYS.ncr),
        audit: findNote(AUTO_NOTE_KEYS.audit),
        kpi: findNote(AUTO_NOTE_KEYS.kpi),
        ohs: findNote(AUTO_NOTE_KEYS.ohs),
      });
      setAdditionalItems(allItems.filter(i => !Object.values(AUTO_NOTE_KEYS).includes(i.question as typeof AUTO_NOTE_KEYS[keyof typeof AUTO_NOTE_KEYS])));
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
        body: JSON.stringify({
          ...outputForm,
          attendees: attendeesForm,
          inputAdditionalItems: [
            ...Object.entries(AUTO_NOTE_KEYS)
              .filter(([k]) => autoNotes[k as keyof AutoNotes].trim())
              .map(([k, q]) => ({ question: q, answer: autoNotes[k as keyof AutoNotes] })),
            ...additionalItems.filter(i => i.question.trim()),
          ],
        }),
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

  const downloadReport = async () => {
    if (!selected) return;
    setDownloadingReport(true);
    try { await generateManagementReviewReportPDF(selected); } finally { setDownloadingReport(false); }
  };

  const downloadXlsx = async () => {
    if (!selected) return;
    setDownloadingXlsx(true);
    try {
      const XLSX = await import('xlsx');
      const rows: (string | number | boolean | null)[][] = [
        ['Management Review Record — HEXA-FRM-008'],
        ['Review Number', selected.reviewNumber],
        ['Period', selected.period],
        ['Date', new Date(selected.reviewDate).toLocaleDateString('en-SA-u-ca-gregory')],
        ['Chairperson', selected.chairperson],
        ['Status', selected.status],
        [],
        ['ATTENDEES'],
        ['Name', 'Role', 'Present'],
        ...(selected.attendees ?? []).map(a => [a.name, a.role, a.present ? 'Yes' : 'No']),
        [],
        ['REVIEW INPUTS (§9.3.2)'],
        ['Section', 'Content'],
        ['Resource Status', selected.inputResourceStatus ?? ''],
        ['Customer Feedback', selected.inputCustomerFeedback ?? ''],
        ['Supplier Performance', selected.inputSupplierPerf ?? ''],
        ['Context Changes', selected.inputContextChanges ?? ''],
        ['Design Performance', selected.inputDesignPerformance ?? ''],
        ['Environmental Performance', selected.inputEnvironmentalPerf ?? ''],
        ['Sales Order Intake', selected.inputSalesOrderIntake ?? ''],
        ['Project Delivery', selected.inputProjectDelivery ?? ''],
        ['Production Tonnage', selected.inputProductionTonnage ?? ''],
        ['Procurement Delays', selected.inputProcurementDelays ?? ''],
        ['Risks & Opportunities', selected.inputRisksOpportunities ?? ''],
        [],
        ['REVIEW OUTPUTS (§9.3.3)'],
        ['Objectives', selected.outputObjectives ?? ''],
        ['Resource Needs', selected.outputResourceNeeds ?? ''],
        [],
        ['ACTION ITEMS'],
        ['Decision', 'Responsible', 'Target Date', 'Status'],
        ...(selected.outputDecisions ?? []).map(d => [d.decision, d.responsible, d.targetDate, d.status]),
        [],
        ['ADDITIONAL ITEMS / Q&A'],
        ['Question', 'Answer'],
        ...(selected.inputAdditionalItems ?? []).filter(i => !Object.values({ prevActions: '__NOTES_PREV__', ncr: '__NOTES_NCR__', audit: '__NOTES_AUDIT__', kpi: '__NOTES_KPI__', ohs: '__NOTES_OHS__' }).includes(i.question)).map(i => [i.question, i.answer]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 35 }, { wch: 60 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Management Review');
      XLSX.writeFile(wb, `${selected.reviewNumber}-FRM-008.xlsx`);
    } finally {
      setDownloadingXlsx(false);
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this management review? This cannot be undone.')) return;
    setDeletingReview(id);
    try {
      const res = await fetch(`/api/ims/management-review/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchReviews(); }
    } finally {
      setDeletingReview(null);
    }
  };

  const addAttendee = () => setAttendeesForm(a => [...a, { ...BLANK_ATTENDEE }]);
  const removeAttendee = (i: number) => setAttendeesForm(a => a.filter((_, idx) => idx !== i));
  const updateAttendee = (i: number, field: keyof Attendee, value: string | boolean) =>
    setAttendeesForm(a => a.map((att, idx) => idx === i ? { ...att, [field]: value } : att));

  const addAdditionalItem = () => setAdditionalItems(items => [...items, { ...BLANK_ITEM }]);
  const removeAdditionalItem = (i: number) => setAdditionalItems(items => items.filter((_, idx) => idx !== i));
  const updateAdditionalItem = (i: number, field: keyof AdditionalItem, value: string) =>
    setAdditionalItems(items => items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const f = (k: keyof OutputForm) => (e: { target: { value: string } }) =>
    setOutputForm(prev => ({ ...prev, [k]: e.target.value }));

  const isLocked = selected?.status === 'LOCKED';

  // ── Section header helper ──────────────────────────────────────────────────
  function SectionLabel({ num, label, auto }: { num: string; label: string; auto?: boolean }) {
    return (
      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
        <span className="text-slate-400 mr-1">{num}.</span>{label}
        {auto && <span className="ml-2 text-slate-400 font-normal normal-case">(auto-populated)</span>}
      </p>
    );
  }

  if (selected) {
    return (
      <div className="p-4 md:p-6 space-y-6 print:p-2">
        {/* Back / Actions */}
        <div className="flex items-center justify-between print:hidden">
          <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            ← Back to list
          </button>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={populate} disabled={populating || isLocked}>
              {populating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              Populate from OTS
            </Button>
            <Button variant="outline" size="sm" onClick={downloadReport} disabled={downloadingReport} className="text-[#2c3e50] border-[#2c3e50]/30 hover:bg-[#2c3e50] hover:text-white transition-colors">
              {downloadingReport ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileDown className="w-4 h-4 mr-1" />}
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={downloadXlsx} disabled={downloadingXlsx} className="text-emerald-700 border-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors">
              {downloadingXlsx ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <FileSpreadsheet className="w-4 h-4 mr-1" />}
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={printReview}><Download className="w-4 h-4 mr-1" />Print</Button>
            {selected.status === 'DRAFT' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={approveReview}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Approve Review
              </Button>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">Management Review Record</p>
              <h1 className="text-2xl font-bold tracking-tight mt-0.5">{selected.reviewNumber}</h1>
              <p className="text-slate-300 mt-0.5">{selected.period} — {new Date(selected.reviewDate).toLocaleDateString('en-SA-u-ca-gregory')}</p>
              <p className="text-slate-400 text-sm mt-1">Chairperson: {selected.chairperson}</p>
              <p className="text-slate-500/80 text-xs font-mono mt-1">HEXA-FRM-008 · Procedure: Hexa-ISP-003 · ISO §9.3</p>
            </div>
            {statusBadge(selected.status)}
          </div>
        </div>

        {/* Attendees */}
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
                    {attendeesForm.map((att, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">
                          {isLocked ? <span>{att.name}</span> : (
                            <Input value={att.name} onChange={e => updateAttendee(i, 'name', e.target.value)} className="h-7 text-xs" placeholder="Full name" />
                          )}
                        </td>
                        <td className="py-1.5 pr-3">
                          {isLocked ? <span>{att.role}</span> : (
                            <Input value={att.role} onChange={e => updateAttendee(i, 'role', e.target.value)} className="h-7 text-xs" placeholder="e.g. CEO, QMR" />
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-center">
                          {isLocked ? (
                            <span className={att.present ? 'text-green-600' : 'text-slate-400'}>{att.present ? '✓' : '✗'}</span>
                          ) : (
                            <input type="checkbox" checked={att.present} onChange={e => updateAttendee(i, 'present', e.target.checked)} className="w-4 h-4 cursor-pointer" />
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

        {/* §9.3.2 Review Inputs */}
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-700">§9.3.2 — Review Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-5">

            {/* 1. Previous actions */}
            <div>
              <SectionLabel num="1" label="Status of Actions from Previous Review" auto />
              {selected.inputPreviousActions ? (
                selected.inputPreviousActions.note ? (
                  <p className="text-xs text-slate-400 italic mb-2">{selected.inputPreviousActions.note}</p>
                ) : (
                  <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 space-y-1 mb-2">
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
              ) : <p className="text-xs text-slate-400 italic mb-2">Not populated yet — click &quot;Populate from OTS&quot;</p>}
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Notes / Commentary</p>
              <Textarea rows={2} value={autoNotes.prevActions} onChange={e => setAutoNotes(n => ({ ...n, prevActions: e.target.value }))} placeholder="Add meeting commentary on previous actions status..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 2. Context */}
            <div>
              <SectionLabel num="2" label="Changes in External & Internal Context" />
              <Textarea rows={2} value={outputForm.inputContextChanges} onChange={f('inputContextChanges')} placeholder="Significant changes in the organization's context, stakeholder needs, or strategic direction..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 3. NCR Summary */}
            <div>
              <SectionLabel num="3" label="NCR Trends & Weld Rejection Rate" auto />
              {selected.inputNcrSummary ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {(selected.inputNcrSummary as { status: string; count: number }[]).map?.((g) => (
                    <span key={g.status} className="text-xs bg-slate-100 px-2 py-1 rounded">{g.status}: {g.count}</span>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic mb-2">Not populated yet</p>}
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Notes / Commentary</p>
              <Textarea rows={2} value={autoNotes.ncr} onChange={e => setAutoNotes(n => ({ ...n, ncr: e.target.value }))} placeholder="NCR trend analysis, weld rejection rate commentary, corrective actions progress..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 4. Audit findings */}
            <div>
              <SectionLabel num="4" label="Internal & External Audit Findings" auto />
              {selected.inputAuditResults ? (
                <div className="text-xs text-slate-600 space-y-1 mb-2">
                  {(selected.inputAuditResults.openFindings ?? []).length > 0 ? (
                    <div className="space-y-1">
                      {(selected.inputAuditResults.openFindings ?? []).slice(0, 5).map((finding: AuditFinding) => (
                        <div key={finding.findingNumber} className="flex gap-2 items-start bg-slate-50 rounded p-1.5">
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">{finding.findingNumber}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${finding.type === 'NC' ? 'bg-red-100 text-red-700' : finding.type === 'OBS' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{finding.type}</span>
                          <span className="line-clamp-1">{finding.description}</span>
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
              ) : <p className="text-xs text-slate-400 italic mb-2">Not populated yet</p>}
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Notes / Commentary</p>
              <Textarea rows={2} value={autoNotes.audit} onChange={e => setAutoNotes(n => ({ ...n, audit: e.target.value }))} placeholder="Audit findings summary, surveillance audit outcomes, certification body feedback..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 5. KPI / Objectives */}
            <div>
              <SectionLabel num="5" label="KPI Progress & IMS Objectives" auto />
              {selected.inputKpiStatus ? (
                <div className="text-xs text-slate-600 bg-slate-50 rounded p-2 mb-2">
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
              ) : <p className="text-xs text-slate-400 italic mb-2">Not populated yet</p>}
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Notes / Commentary</p>
              <Textarea rows={2} value={autoNotes.kpi} onChange={e => setAutoNotes(n => ({ ...n, kpi: e.target.value }))} placeholder="KPI achievement commentary, objective status, corrective actions for missed targets..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 6. Risks & Opportunities */}
            <div>
              <SectionLabel num="6" label="Risks and Opportunities Update" />
              <Textarea rows={2} value={outputForm.inputRisksOpportunities} onChange={f('inputRisksOpportunities')} placeholder="Summarise open critical/high risks, new risks identified, opportunities being pursued, and risk treatment progress..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 7. Sales / Order Intake */}
            <div>
              <SectionLabel num="7" label="Sales / Order Intake" />
              <Textarea rows={2} value={outputForm.inputSalesOrderIntake} onChange={f('inputSalesOrderIntake')} placeholder="New orders received (tonnage, SAR value), pipeline status, tender results, BD activity, backlog vs capacity..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 8. Project Delivery */}
            <div>
              <SectionLabel num="8" label="Project Delivery Performance" />
              <Textarea rows={2} value={outputForm.inputProjectDelivery} onChange={f('inputProjectDelivery')} placeholder="On-time delivery rate, dispatch performance vs schedule, site feedback, outstanding punch lists, client satisfaction scores..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 9. Production Tonnage */}
            <div>
              <SectionLabel num="9" label="Production Tonnage & Bottlenecks" />
              <Textarea rows={2} value={outputForm.inputProductionTonnage} onChange={f('inputProductionTonnage')} placeholder="Fabricated tonnage vs plan, production utilisation (%), line bottlenecks (welding/blasting/coating), equipment downtime..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 10. Customer feedback */}
            <div>
              <SectionLabel num="10" label="Customer Complaints & Satisfaction" />
              <Textarea rows={2} value={outputForm.inputCustomerFeedback} onChange={f('inputCustomerFeedback')} placeholder="Customer complaints, satisfaction scores, 9COM correspondence, repeat-order rate, client relationship updates..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 11. Procurement Delays */}
            <div>
              <SectionLabel num="11" label="Procurement Delays & Supplier Performance" />
              <Textarea rows={2} value={outputForm.inputProcurementDelays} onChange={f('inputProcurementDelays')} placeholder="Material delivery delays (steel, fasteners, consumables), lead time issues, steel price movements, alternative sourcing actions taken..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 12. Supplier performance */}
            <div>
              <SectionLabel num="12" label="Supplier & External Provider Performance" />
              <Textarea rows={2} value={outputForm.inputSupplierPerf} onChange={f('inputSupplierPerf')} placeholder="Assessment of key suppliers and subcontractors — on-time delivery, quality rejections, MIR acceptance rates, approved supplier list changes..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 13. HSE incidents */}
            <div>
              <SectionLabel num="13" label="HSE Incidents & Near-Miss Trends" auto />
              {selected.inputOhsPerformance ? (
                <div className="text-xs text-slate-600 space-y-1 mb-2">
                  <div className="flex flex-wrap gap-2">
                    {(selected.inputOhsPerformance.byStatus ?? []).map((s: { status: string; count: number }) => (
                      <span key={s.status} className="text-xs bg-slate-100 px-2 py-1 rounded">{s.status}: {s.count}</span>
                    ))}
                  </div>
                  {selected.inputOhsPerformance.note && <p className="text-slate-400 italic">{selected.inputOhsPerformance.note}</p>}
                </div>
              ) : <p className="text-xs text-slate-400 italic mb-2">Not populated yet</p>}
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Notes / Commentary</p>
              <Textarea rows={2} value={autoNotes.ohs} onChange={e => setAutoNotes(n => ({ ...n, ohs: e.target.value }))} placeholder="HSE incident trend analysis, root causes, prevention measures, LTIFR commentary..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 14. Environmental performance */}
            <div>
              <SectionLabel num="14" label="Environmental Performance (ISO 14001)" />
              <Textarea rows={2} value={outputForm.inputEnvironmentalPerf} onChange={f('inputEnvironmentalPerf')} placeholder="Waste management, energy consumption, environmental objectives progress, VOC/waste disposal compliance, significant aspects update..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 15. Design performance */}
            <div>
              <SectionLabel num="15" label="Design Performance: RFI Rate, Drawing Accuracy" />
              <Textarea rows={2} value={outputForm.inputDesignPerformance} onChange={f('inputDesignPerformance')} placeholder="RFI frequency, drawing rejection rates by consultant, value engineering outcomes, drawing release on-time rate..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 16. Resource adequacy */}
            <div>
              <SectionLabel num="16" label="Adequacy of Resources" />
              <Textarea rows={2} value={outputForm.inputResourceStatus} onChange={f('inputResourceStatus')} placeholder="Staffing levels, equipment adequacy, training coverage, calibration status, infrastructure needs..." className="text-xs" disabled={isLocked} />
            </div>

            {/* 17. Continual improvement */}
            <div className="bg-slate-50 rounded p-3">
              <SectionLabel num="17" label="Opportunities for Continual Improvement" />
              <p className="text-xs text-slate-400 italic">Improvement opportunities and formal decisions are recorded in the §9.3.3 Outputs section below.</p>
            </div>

          </CardContent>
        </Card>

        {/* §9.3.3 Outputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-700">§9.3.3 — Review Outputs &amp; Decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400 italic -mt-1">Improvement opportunities (§9.3.2 item 17) are recorded here as formal decisions.</p>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Improvement Decisions &amp; Objectives</p>
              <Textarea rows={4} value={outputForm.outputObjectives} onChange={f('outputObjectives')} placeholder="Decisions with assigned owners, target dates, and measurable objectives for improvement..." disabled={isLocked} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Resource Needs</p>
              <Textarea rows={3} value={outputForm.outputResourceNeeds} onChange={f('outputResourceNeeds')} placeholder="Decisions on resource requirements — personnel, equipment, training, infrastructure..." disabled={isLocked} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes / Minutes</p>
              <Textarea rows={3} value={outputForm.notes} onChange={f('notes')} placeholder="Meeting notes, discussion points, action items..." disabled={isLocked} />
            </div>
          </CardContent>
        </Card>

        {/* Additional Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4" />
              Additional Agenda Items
              <Badge variant="outline" className="text-[10px] ml-1">Custom Q&amp;A</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-400 -mt-1">Add any project-specific, customer-specific, or management-driven agenda items not covered by the standard sections above. These will appear in the PDF export.</p>
            {additionalItems.length === 0 && (
              <p className="text-xs text-slate-400 italic">No additional items yet.</p>
            )}
            {additionalItems.map((item, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Item {i + 1}</span>
                  {!isLocked && (
                    <button onClick={() => removeAdditionalItem(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Question / Topic</p>
                  {isLocked ? (
                    <p className="text-sm font-medium text-slate-700">{item.question || '—'}</p>
                  ) : (
                    <Input value={item.question} onChange={e => updateAdditionalItem(i, 'question', e.target.value)} placeholder="e.g. Status of NEOM project tendering" className="text-xs h-8" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Answer / Discussion Notes</p>
                  {isLocked ? (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.answer || '—'}</p>
                  ) : (
                    <Textarea value={item.answer} onChange={e => updateAdditionalItem(i, 'answer', e.target.value)} rows={2} placeholder="Record the discussion notes or decision..." className="text-xs" />
                  )}
                </div>
              </div>
            ))}
            {!isLocked && (
              <Button variant="outline" size="sm" onClick={addAdditionalItem} className="text-xs h-7 gap-1">
                <Plus className="w-3 h-3" /> Add Agenda Item
              </Button>
            )}
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
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Management Review</h1>
            <p className="text-slate-300 text-sm mt-0.5">ISO 9001 / 14001 / 45001 §9.3 — Executive quality management reviews</p>
            <p className="text-slate-400/70 text-xs font-mono mt-1">HEXA-FRM-008 · Procedure: Hexa-ISP-003 · ISO §9.3</p>
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
        <Button variant="outline" size="sm" onClick={fetchReviews} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
        <Button size="sm" onClick={() => setCreateDialog(true)} className="gap-1.5 text-white" style={{ backgroundColor: '#2c3e50' }}>
          <Plus className="w-4 h-4" /> New Review
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Reviews', value: reviews.length, color: 'text-[#2c3e50]', bg: 'bg-white border border-slate-200', icon: '📋' },
          { label: 'Approved', value: reviews.filter(r => r.status === 'APPROVED' || r.status === 'LOCKED').length, color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-200', icon: '✅' },
          { label: 'Drafts', value: reviews.filter(r => r.status === 'DRAFT').length, color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-200', icon: '📝' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.bg} hover:shadow-sm transition-shadow`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-500 font-medium">{k.label}</p>
              <span className="text-base">{k.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#2c3e50]">Management Reviews</p>
          <p className="text-xs text-slate-400">{reviews.length} records</p>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Review #</th>
                  <th className="px-4 py-3 text-left font-semibold">Period</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Chairperson</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                      <span className="text-xs">Loading reviews…</span>
                    </div>
                  </td></tr>
                ) : reviews.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ClipboardList className="w-8 h-8 text-slate-200" />
                      <span className="text-sm">No management reviews yet</span>
                    </div>
                  </td></tr>
                ) : reviews.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-[#2c3e50] cursor-pointer" onClick={() => fetchDetail(r.id)}>{r.reviewNumber}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium cursor-pointer" onClick={() => fetchDetail(r.id)}>{r.period}</td>
                    <td className="px-4 py-3 text-slate-500 cursor-pointer" onClick={() => fetchDetail(r.id)}>{new Date(r.reviewDate).toLocaleDateString('en-SA-u-ca-gregory')}</td>
                    <td className="px-4 py-3 text-slate-600 cursor-pointer" onClick={() => fetchDetail(r.id)}>{r.chairperson}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => fetchDetail(r.id)}>{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); fetchDetail(r.id); }}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-[#2c3e50] transition-colors"
                          title="Open"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteReview(r.id); }}
                          disabled={deletingReview === r.id}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
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
