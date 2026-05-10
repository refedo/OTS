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
import {
  ArrowLeft, Plus, CheckCircle2, Loader2, FileDown, Search,
  ChevronRight, FileText, Shield,
} from 'lucide-react';
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
  // FRM-004 fields
  processArea: string | null;
  riskLevel: string | null;
  isoClausesInScope: string[] | null;
  auditorIndependenceConfirmed: boolean;
  approvedByImsManagerName: string | null;
  approvedByImsManagerDate: string | null;
  approvedByImsManagerSigned: boolean;
  approvedByTopMgmtName: string | null;
  approvedByTopMgmtDate: string | null;
  approvedByTopMgmtSigned: boolean;
  // FRM-005 fields
  reportExecutiveSummary: string | null;
  reportAuditMethod: string[] | null;
  reportPositiveFindings: string | null;
  reportConclusion: string | null;
  reportRecommendation: string | null;
  reportLeadAuditorName: string | null;
  reportLeadAuditorDate: string | null;
  reportLeadAuditorSigned: boolean;
  reportImsMgrName: string | null;
  reportImsMgrDate: string | null;
  reportImsMgrSigned: boolean;
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
  coverageSummary: string[];
};

const FINDING_TYPE_CFG: Record<string, string> = {
  NC: 'bg-red-100 text-red-700',
  OFI: 'bg-blue-100 text-blue-700',
  Observation: 'bg-slate-100 text-slate-600',
  Conforming: 'bg-green-100 text-green-700',
};

const FINDING_STATUS_CFG: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  CLOSED: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-200 text-red-800 font-semibold',
};

const PROCESS_AREAS = [
  'Engineering', 'Supply Chain', 'Projects', 'Sales',
  'Production', 'HSE', 'HR', 'Finance', 'Management',
];

const AUDIT_METHODS = [
  'Checklist-based interview',
  'Document review',
  'Observation',
  'Combination',
];

const CONCLUSION_OPTIONS = [
  'Fully conforming',
  'Minor NCs identified',
  'Major NC identified — re-audit required',
];

type ApprovalForm = {
  imsManagerName: string;
  imsManagerDate: string;
  imsManagerSigned: boolean;
  topMgmtName: string;
  topMgmtDate: string;
  topMgmtSigned: boolean;
};

type ReportForm = {
  executiveSummary: string;
  auditMethod: string[];
  positiveFindings: string;
  conclusion: string;
  recommendation: string;
  leadAuditorName: string;
  leadAuditorDate: string;
  leadAuditorSigned: boolean;
  imsMgrName: string;
  imsMgrDate: string;
  imsMgrSigned: boolean;
};

function isoDateToInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

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
  const [savingApproval, setSavingApproval] = useState(false);
  const [savingReport, setSavingReport] = useState(false);

  const [isoClauseInput, setIsoClauseInput] = useState('');

  const [auditForm, setAuditForm] = useState({
    scope: '',
    scheduledDate: '',
    auditorId: '',
    auditeeId: '',
    processArea: '',
    riskLevel: '',
    isoClausesInScope: [] as string[],
    auditorIndependenceConfirmed: false,
  });

  const [findingForm, setFindingForm] = useState({
    type: 'NC' as 'NC' | 'OFI' | 'Observation',
    description: '', evidence: '', correctiveAction: '',
    responsibleId: '', targetDate: '',
  });

  const [approvalForm, setApprovalForm] = useState<ApprovalForm>({
    imsManagerName: '',
    imsManagerDate: '',
    imsManagerSigned: false,
    topMgmtName: '',
    topMgmtDate: '',
    topMgmtSigned: false,
  });

  const [reportForm, setReportForm] = useState<ReportForm>({
    executiveSummary: '',
    auditMethod: [],
    positiveFindings: '',
    conclusion: '',
    recommendation: '',
    leadAuditorName: '',
    leadAuditorDate: '',
    leadAuditorSigned: false,
    imsMgrName: '',
    imsMgrDate: '',
    imsMgrSigned: false,
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
    setAuditForm({
      scope: '', scheduledDate: '', auditorId: '', auditeeId: '',
      processArea: '', riskLevel: '', isoClausesInScope: [],
      auditorIndependenceConfirmed: false,
    });
    setIsoClauseInput('');
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

  const populateFormsFromAudit = (audit: Audit) => {
    setApprovalForm({
      imsManagerName: audit.approvedByImsManagerName ?? '',
      imsManagerDate: isoDateToInputValue(audit.approvedByImsManagerDate),
      imsManagerSigned: audit.approvedByImsManagerSigned ?? false,
      topMgmtName: audit.approvedByTopMgmtName ?? '',
      topMgmtDate: isoDateToInputValue(audit.approvedByTopMgmtDate),
      topMgmtSigned: audit.approvedByTopMgmtSigned ?? false,
    });
    setReportForm({
      executiveSummary: audit.reportExecutiveSummary ?? '',
      auditMethod: audit.reportAuditMethod ?? [],
      positiveFindings: audit.reportPositiveFindings ?? '',
      conclusion: audit.reportConclusion ?? '',
      recommendation: audit.reportRecommendation ?? '',
      leadAuditorName: audit.reportLeadAuditorName ?? '',
      leadAuditorDate: isoDateToInputValue(audit.reportLeadAuditorDate),
      leadAuditorSigned: audit.reportLeadAuditorSigned ?? false,
      imsMgrName: audit.reportImsMgrName ?? '',
      imsMgrDate: isoDateToInputValue(audit.reportImsMgrDate),
      imsMgrSigned: audit.reportImsMgrSigned ?? false,
    });
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
          processArea: auditForm.processArea || null,
          riskLevel: auditForm.riskLevel || null,
          isoClausesInScope: auditForm.isoClausesInScope.length > 0 ? auditForm.isoClausesInScope : null,
          auditorIndependenceConfirmed: auditForm.auditorIndependenceConfirmed,
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
    populateFormsFromAudit(audit);
  };

  const closeFinding = async (findingId: string) => {
    await fetch(`/api/ims/audit-findings/${findingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLOSED', closedAt: new Date().toISOString() }),
    });
    if (selectedAudit) fetchFindings(selectedAudit.id);
  };

  const saveApprovals = async () => {
    if (!selectedAudit) return;
    setSavingApproval(true);
    try {
      await fetch(`/api/ims/audits/${selectedAudit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedByImsManagerName: approvalForm.imsManagerName || null,
          approvedByImsManagerDate: approvalForm.imsManagerDate
            ? new Date(approvalForm.imsManagerDate).toISOString()
            : null,
          approvedByImsManagerSigned: approvalForm.imsManagerSigned,
          approvedByTopMgmtName: approvalForm.topMgmtName || null,
          approvedByTopMgmtDate: approvalForm.topMgmtDate
            ? new Date(approvalForm.topMgmtDate).toISOString()
            : null,
          approvedByTopMgmtSigned: approvalForm.topMgmtSigned,
        }),
      });
    } finally {
      setSavingApproval(false);
    }
  };

  const saveReport = async () => {
    if (!selectedAudit) return;
    setSavingReport(true);
    try {
      await fetch(`/api/ims/audits/${selectedAudit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportExecutiveSummary: reportForm.executiveSummary || null,
          reportAuditMethod: reportForm.auditMethod.length > 0 ? reportForm.auditMethod : null,
          reportPositiveFindings: reportForm.positiveFindings || null,
          reportConclusion: reportForm.conclusion || null,
          reportRecommendation: reportForm.recommendation || null,
          reportLeadAuditorName: reportForm.leadAuditorName || null,
          reportLeadAuditorDate: reportForm.leadAuditorDate
            ? new Date(reportForm.leadAuditorDate).toISOString()
            : null,
          reportLeadAuditorSigned: reportForm.leadAuditorSigned,
          reportImsMgrName: reportForm.imsMgrName || null,
          reportImsMgrDate: reportForm.imsMgrDate
            ? new Date(reportForm.imsMgrDate).toISOString()
            : null,
          reportImsMgrSigned: reportForm.imsMgrSigned,
        }),
      });
    } finally {
      setSavingReport(false);
    }
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

  const toggleReportMethod = (method: string) => {
    setReportForm(f => ({
      ...f,
      auditMethod: f.auditMethod.includes(method)
        ? f.auditMethod.filter(m => m !== method)
        : [...f.auditMethod, method],
    }));
  };

  const addIsoClause = () => {
    const val = isoClauseInput.trim();
    if (!val) return;
    if (!auditForm.isoClausesInScope.includes(val)) {
      setAuditForm(f => ({ ...f, isoClausesInScope: [...f.isoClausesInScope, val] }));
    }
    setIsoClauseInput('');
  };

  const removeIsoClause = (clause: string) => {
    setAuditForm(f => ({ ...f, isoClausesInScope: f.isoClausesInScope.filter(c => c !== clause) }));
  };

  // Finding type counts for FRM-005 auto-calculation
  const findingCounts = {
    Conforming: findings.filter(f => f.type === 'Conforming').length,
    NC: findings.filter(f => f.type === 'NC').length,
    OFI: findings.filter(f => f.type === 'OFI').length,
    Observation: findings.filter(f => f.type === 'Observation').length,
  };

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;
  if (!plan) return <div className="p-6 text-slate-400">Plan not found.</div>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
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

      {/* Plan Hero */}
      <div className="relative overflow-hidden rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 60%, #2c3e50 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight">{plan.planNumber}</h1>
          <p className="text-slate-300 mt-0.5">{plan.auditType} Audit Plan — {plan.year}</p>
          <span className="mt-2 inline-block text-xs bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">{plan.status.replace('_', ' ')}</span>
        </div>
      </div>

      {/* ISO Clauses Coverage Summary */}
      {plan.coverageSummary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              ISO Clauses Covered This Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {plan.coverageSummary.map(clause => (
                <span key={clause} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
                  {clause}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audits + Findings */}
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
                <div className="flex flex-wrap gap-3 text-xs text-slate-400 mt-1">
                  <span>{new Date(a.scheduledDate).toLocaleDateString('en-SA-u-ca-gregory')}</span>
                  <span>{a._count.findings} findings</span>
                  {a.auditor && <span>Auditor: {a.auditor.name}</span>}
                  {a.processArea && <span className="text-indigo-500">{a.processArea}</span>}
                  {a.riskLevel && (
                    <span className={`font-medium ${a.riskLevel === 'High' ? 'text-red-500' : a.riskLevel === 'Medium' ? 'text-amber-500' : 'text-green-600'}`}>
                      {a.riskLevel} Risk
                    </span>
                  )}
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
              <div className="flex items-center gap-2">
                <Link href={`/ims/audit-checklist/${selectedAudit.id}`}>
                  <Button size="sm" variant="outline" className="gap-1 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                    <FileText className="w-3 h-3" /> Open Checklist <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
                <Button size="sm" onClick={openFindingDialog} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-3 h-3 mr-1" /> Add Finding
                </Button>
              </div>
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

      {/* ─── Audit Detail Sections (shown when an audit is selected) ─── */}
      {selectedAudit && (
        <div className="space-y-6">

          {/* FRM-004: Audit Schedule Approval */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" />
                FRM-004 — Audit Schedule Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IMS Manager */}
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">IMS Manager Sign-off</p>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={approvalForm.imsManagerName}
                      onChange={e => setApprovalForm(f => ({ ...f, imsManagerName: e.target.value }))}
                      placeholder="IMS Manager name"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={approvalForm.imsManagerDate}
                      onChange={e => setApprovalForm(f => ({ ...f, imsManagerDate: e.target.value }))}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalForm.imsManagerSigned}
                      onChange={e => setApprovalForm(f => ({ ...f, imsManagerSigned: e.target.checked }))}
                      className="rounded"
                    />
                    IMS Manager Signed
                  </label>
                </div>

                {/* Top Management */}
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Top Management Approval</p>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={approvalForm.topMgmtName}
                      onChange={e => setApprovalForm(f => ({ ...f, topMgmtName: e.target.value }))}
                      placeholder="Top management name"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={approvalForm.topMgmtDate}
                      onChange={e => setApprovalForm(f => ({ ...f, topMgmtDate: e.target.value }))}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approvalForm.topMgmtSigned}
                      onChange={e => setApprovalForm(f => ({ ...f, topMgmtSigned: e.target.checked }))}
                      className="rounded"
                    />
                    Top Management Signed
                  </label>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  onClick={saveApprovals}
                  disabled={savingApproval}
                  className="bg-[#2c3e50] hover:bg-[#34495e]"
                >
                  {savingApproval ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving…</> : 'Save Approvals'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FRM-005: Internal Audit Report */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                FRM-005 — Internal Audit Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Executive Summary */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Executive Summary</Label>
                <Textarea
                  rows={3}
                  value={reportForm.executiveSummary}
                  onChange={e => setReportForm(f => ({ ...f, executiveSummary: e.target.value }))}
                  placeholder="Provide a brief executive summary of this audit…"
                  className="mt-1 text-sm"
                />
              </div>

              {/* Audit Method */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Audit Method</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {AUDIT_METHODS.map(method => (
                    <label key={method} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportForm.auditMethod.includes(method)}
                        onChange={() => toggleReportMethod(method)}
                        className="rounded"
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>

              {/* Finding Counts (read-only) */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Finding Summary (auto-calculated)</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full font-medium">
                    Conforming: {findingCounts.Conforming}
                  </span>
                  <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full font-medium">
                    NC: {findingCounts.NC}
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-medium">
                    OFI: {findingCounts.OFI}
                  </span>
                  <span className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1 rounded-full font-medium">
                    Observations: {findingCounts.Observation}
                  </span>
                </div>
              </div>

              {/* Positive Findings */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Positive Findings / Commendations</Label>
                <Textarea
                  rows={2}
                  value={reportForm.positiveFindings}
                  onChange={e => setReportForm(f => ({ ...f, positiveFindings: e.target.value }))}
                  placeholder="Note any areas of commendable practice observed…"
                  className="mt-1 text-sm"
                />
              </div>

              {/* Overall Conclusion */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Overall Conclusion</Label>
                <Select
                  value={reportForm.conclusion || '__none__'}
                  onValueChange={v => setReportForm(f => ({ ...f, conclusion: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select conclusion…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select —</SelectItem>
                    {CONCLUSION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Recommendation */}
              <div>
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recommendation</Label>
                <Textarea
                  rows={2}
                  value={reportForm.recommendation}
                  onChange={e => setReportForm(f => ({ ...f, recommendation: e.target.value }))}
                  placeholder="Recommendations for improvement or follow-up…"
                  className="mt-1 text-sm"
                />
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Auditor */}
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Lead Auditor</p>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={reportForm.leadAuditorName}
                      onChange={e => setReportForm(f => ({ ...f, leadAuditorName: e.target.value }))}
                      placeholder="Lead auditor name"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={reportForm.leadAuditorDate}
                      onChange={e => setReportForm(f => ({ ...f, leadAuditorDate: e.target.value }))}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportForm.leadAuditorSigned}
                      onChange={e => setReportForm(f => ({ ...f, leadAuditorSigned: e.target.checked }))}
                      className="rounded"
                    />
                    Lead Auditor Signed
                  </label>
                </div>

                {/* IMS Manager Acknowledgment */}
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">IMS Manager Acknowledgment</p>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={reportForm.imsMgrName}
                      onChange={e => setReportForm(f => ({ ...f, imsMgrName: e.target.value }))}
                      placeholder="IMS Manager name"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={reportForm.imsMgrDate}
                      onChange={e => setReportForm(f => ({ ...f, imsMgrDate: e.target.value }))}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportForm.imsMgrSigned}
                      onChange={e => setReportForm(f => ({ ...f, imsMgrSigned: e.target.checked }))}
                      className="rounded"
                    />
                    IMS Manager Signed
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={saveReport}
                  disabled={savingReport}
                  className="bg-[#2c3e50] hover:bg-[#34495e]"
                >
                  {savingReport ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving…</> : 'Save Report'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Audit Dialog */}
      <Dialog open={auditDialog} onOpenChange={setAuditDialog}>
        <DialogContent className="max-w-xl">
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

            {/* Process Area */}
            <div>
              <Label>Process Area</Label>
              <Select value={auditForm.processArea || '__none__'} onValueChange={v => setAuditForm(f => ({ ...f, processArea: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select process area…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {PROCESS_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Risk Level */}
            <div>
              <Label>Risk Level</Label>
              <Select value={auditForm.riskLevel || '__none__'} onValueChange={v => setAuditForm(f => ({ ...f, riskLevel: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select risk level…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ISO Clauses in Scope */}
            <div>
              <Label>ISO Clauses in Scope (e.g. ISO 9001:2015 §8.4)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={isoClauseInput}
                  onChange={e => setIsoClauseInput(e.target.value)}
                  placeholder="ISO 9001:2015 §8.4"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIsoClause(); } }}
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={addIsoClause} className="px-3">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {auditForm.isoClausesInScope.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {auditForm.isoClausesInScope.map(clause => (
                    <span key={clause} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                      {clause}
                      <button
                        type="button"
                        onClick={() => removeIsoClause(clause)}
                        className="hover:text-indigo-900 leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Auditor Independence */}
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={auditForm.auditorIndependenceConfirmed}
                onChange={e => setAuditForm(f => ({ ...f, auditorIndependenceConfirmed: e.target.checked }))}
                className="rounded mt-0.5"
              />
              <span className="text-slate-600">
                I confirm the auditor has no responsibility for the area being audited (ISO §9.2.2)
              </span>
            </label>

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
