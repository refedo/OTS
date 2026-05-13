'use client';

import { generateSubcontractorContractPDF } from '@/lib/subcontractor-contract-pdf-generator';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Handshake, ChevronLeft, CheckCircle2, Clock, AlertTriangle, Ban,
  TrendingUp, Plus, Loader2, RefreshCw, Building2, FolderOpen,
  DollarSign, FileText, Send, ThumbsUp, PlayCircle, PauseCircle, XCircle,
  Flag, ExternalLink, AlertCircle, ChevronDown, ChevronUp, Pencil, Trash2, Printer,
} from 'lucide-react';

type Cert = {
  id: string;
  certificateNumber: string;
  certificateDate: string;
  periodFrom: string | null;
  periodTo: string | null;
  currentPercentage: number;
  previousCumulativePercentage: number;
  cumulativePercentage: number;
  currentAmount: number;
  previousCumulativeAmount: number;
  cumulativeAmount: number;
  retentionAmount: number;
  netAmountDue: number;
  paidAmount: number;
  status: string;
  dolibarrInvoiceRef: string | null;
  dolibarrInvoiceId: number | null;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
};

type Contract = {
  id: string;
  contractNumber: string;
  name: string;
  status: string;
  contractValue: number;
  currency: string;
  retentionPercentage: number;
  scopeLevel: string;
  scopeTypes: string[];
  scopeItems: Record<string, unknown>[] | null;
  paymentTerms: Record<string, unknown>[] | null;
  termsAndConditions: string | null;
  templateType: string | null;
  notes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  project: { id: string; projectNumber: string; name: string };
  building: { id: string; designation: string; name: string; location: string | null } | null;
  supplier: { id: string; supplierCode: string; name: string; rating: string | null; category: string | null; scopeOfApproval: string | null };
  createdBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  paymentCertificates: Cert[];
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  DRAFT:     { label: 'Draft',      cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  SUBMITTED: { label: 'Submitted',  cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  APPROVED:  { label: 'Approved',   cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  ACTIVE:    { label: 'Active',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  SUSPENDED: { label: 'Suspended',  cls: 'bg-orange-100 text-orange-700 border-orange-300' },
  COMPLETED: { label: 'Completed',  cls: 'bg-teal-100 text-teal-700 border-teal-300' },
  CANCELLED: { label: 'Cancelled',  cls: 'bg-rose-100 text-rose-700 border-rose-300' },
};

const CERT_STATUS_CFG: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-700 border-slate-300',
  SUBMITTED: 'bg-amber-100 text-amber-700 border-amber-300',
  APPROVED:  'bg-blue-100 text-blue-700 border-blue-300',
  PAID:      'bg-emerald-100 text-emerald-700 border-emerald-300',
  CANCELLED: 'bg-rose-100 text-rose-700 border-rose-300',
};

function fmt(n: number, currency = 'SAR') {
  return new Intl.NumberFormat('en-SA-u-ca-gregory', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-SA-u-ca-gregory', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface Props {
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canCertCreate: boolean;
  canCertApprove: boolean;
}

export default function SubcontractorContractDetailPage({ canEdit, canDelete, canApprove: hasApprovePermission, canCertCreate, canCertApprove }: Props) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [tcCollapsed, setTcCollapsed] = useState(true);

  // ── Variations ──────────────────────────────────────────────────────────────
  type Variation = { id: string; variationNumber: string; description: string; amount: number; status: string; notes: string | null; createdBy: { name: string }; approvedBy: { name: string } | null; createdAt: string };
  const [variations, setVariations] = useState<Variation[]>([]);
  const [varDialog, setVarDialog] = useState(false);
  const [varDesc, setVarDesc] = useState('');
  const [varAmount, setVarAmount] = useState('');
  const [varNotes, setVarNotes] = useState('');
  const [varSaving, setVarSaving] = useState(false);

  const fetchVariations = useCallback(async () => {
    const res = await fetch(`/api/subcontractor-contracts/${id}/variations`);
    if (res.ok) setVariations(await res.json());
  }, [id]);

  // ── Deductions ──────────────────────────────────────────────────────────────
  type Deduction = { id: string; description: string; amount: number; deductionDate: string; reason: string | null; status: string; createdBy: { name: string }; approvedBy: { name: string } | null; createdAt: string };
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [dedDialog, setDedDialog] = useState(false);
  const [dedDesc, setDedDesc] = useState('');
  const [dedAmount, setDedAmount] = useState('');
  const [dedDate, setDedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dedReason, setDedReason] = useState('');
  const [dedSaving, setDedSaving] = useState(false);

  const fetchDeductions = useCallback(async () => {
    const res = await fetch(`/api/subcontractor-contracts/${id}/deductions`);
    if (res.ok) setDeductions(await res.json());
  }, [id]);

  // ── New cert dialog ─────────────────────────────────────────────────────────
  const [certDialog, setCertDialog] = useState(false);
  const [certDate, setCertDate] = useState(new Date().toISOString().split('T')[0]);
  const [certPeriodFrom, setCertPeriodFrom] = useState('');
  const [certPeriodTo, setCertPeriodTo] = useState('');
  const [certPct, setCertPct] = useState('');
  const [certDoliRef, setCertDoliRef] = useState('');
  const [certDoliId, setCertDoliId] = useState('');
  const [certNotes, setCertNotes] = useState('');
  const [certSaving, setCertSaving] = useState(false);
  const [certError, setCertError] = useState('');

  // ── Edit contract dialog ────────────────────────────────────────────────────
  const [editDialog, setEditDialog] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editRetention, setEditRetention] = useState('');
  const [editCurrency, setEditCurrency] = useState('SAR');
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // ── Delete contract dialog ──────────────────────────────────────────────────
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Delete cert dialog ──────────────────────────────────────────────────────
  const [deleteCertDialog, setDeleteCertDialog] = useState(false);
  const [deleteCertId, setDeleteCertId] = useState('');
  const [deleteCertNumber, setDeleteCertNumber] = useState('');
  const [deleteCertReason, setDeleteCertReason] = useState('');
  const [deleteCertLoading, setDeleteCertLoading] = useState(false);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/subcontractor-contracts/${id}`);
    if (res.ok) setContract(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchContract(); fetchVariations(); fetchDeductions(); }, [fetchContract, fetchVariations, fetchDeductions]);

  const handleAction = async (action: string, reason?: string) => {
    setActionLoading(true);
    setError('');
    const res = await fetch(`/api/subcontractor-contracts/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    });
    if (res.ok) {
      await fetchContract();
    } else {
      const d = await res.json() as { error?: string };
      setError(d.error ?? 'Action failed');
    }
    setActionLoading(false);
  };

  const handleCertAction = async (certId: string, action: string, extra?: Record<string, unknown>) => {
    const res = await fetch(`/api/subcontractor-contracts/${id}/payment-certificates/${certId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    if (res.ok) await fetchContract();
  };

  const handleCreateCert = async () => {
    setCertSaving(true);
    setCertError('');
    const res = await fetch(`/api/subcontractor-contracts/${id}/payment-certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        certificateDate: certDate,
        periodFrom: certPeriodFrom || null,
        periodTo: certPeriodTo || null,
        currentPercentage: Number(certPct),
        dolibarrInvoiceRef: certDoliRef || null,
        dolibarrInvoiceId: certDoliId ? Number(certDoliId) : null,
        notes: certNotes || null,
      }),
    });
    if (res.ok) {
      setCertDialog(false);
      setCertPct('');
      setCertDoliRef('');
      setCertDoliId('');
      setCertNotes('');
      await fetchContract();
    } else {
      const d = await res.json() as { error?: string };
      setCertError(d.error ?? 'Failed to create certificate');
    }
    setCertSaving(false);
  };

  const openEditDialog = () => {
    if (!contract) return;
    setEditValue(String(contract.contractValue));
    setEditRetention(String(contract.retentionPercentage));
    setEditCurrency(contract.currency);
    setEditNotes(contract.notes ?? '');
    setEditError('');
    setEditDialog(true);
  };

  const handleEdit = async () => {
    setEditSaving(true);
    setEditError('');
    const res = await fetch(`/api/subcontractor-contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractValue: Number(editValue),
        retentionPercentage: Number(editRetention),
        currency: editCurrency,
        notes: editNotes || null,
      }),
    });
    if (res.ok) {
      setEditDialog(false);
      await fetchContract();
    } else {
      const d = await res.json() as { error?: string };
      setEditError(d.error ?? 'Failed to update contract');
    }
    setEditSaving(false);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    const res = await fetch(`/api/subcontractor-contracts/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: deleteReason }),
    });
    if (res.ok) {
      router.push('/supply-chain/subcontractors');
    } else {
      const d = await res.json() as { error?: string };
      setError(d.error ?? 'Failed to delete contract');
      setDeleteDialog(false);
    }
    setDeleteLoading(false);
  };

  const openDeleteCertDialog = (certId: string, certNumber: string) => {
    setDeleteCertId(certId);
    setDeleteCertNumber(certNumber);
    setDeleteCertReason('');
    setDeleteCertDialog(true);
  };

  const handleDeleteCert = async () => {
    if (!deleteCertReason.trim()) return;
    setDeleteCertLoading(true);
    const res = await fetch(`/api/subcontractor-contracts/${id}/payment-certificates/${deleteCertId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: deleteCertReason }),
    });
    if (res.ok) {
      setDeleteCertDialog(false);
      await fetchContract();
    }
    setDeleteCertLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Contract not found.
      </div>
    );
  }

  const cfg = STATUS_CFG[contract.status] ?? STATUS_CFG.DRAFT;
  const latestCert = contract.paymentCertificates
    .filter(c => c.status !== 'CANCELLED')
    .sort((a, b) => Number(b.cumulativePercentage) - Number(a.cumulativePercentage))[0];
  const progress = latestCert ? Number(latestCert.cumulativePercentage) : 0;
  const totalPaid = contract.paymentCertificates
    .filter(c => c.status === 'PAID')
    .reduce((s, c) => s + Number(c.paidAmount), 0);
  const totalApproved = contract.paymentCertificates
    .filter(c => c.status === 'APPROVED')
    .reduce((s, c) => s + Number(c.netAmountDue), 0);

  const canSubmit   = canEdit && contract.status === 'DRAFT';
  const canApprove  = hasApprovePermission && contract.status === 'SUBMITTED';
  const canActivate = canEdit && contract.status === 'APPROVED';
  const canSuspend  = canEdit && contract.status === 'ACTIVE';
  const canResume   = canEdit && contract.status === 'SUSPENDED';
  const canComplete = canEdit && contract.status === 'ACTIVE';
  const canCancel   = canEdit && ['DRAFT', 'SUBMITTED', 'APPROVED'].includes(contract.status);
  const canEditFields = canEdit && contract.status === 'DRAFT';
  const canDeleteContract = canDelete && ['DRAFT', 'CANCELLED'].includes(contract.status);
  const canAddCert  = canCertCreate && contract.status === 'ACTIVE';

  async function handlePrint() {
    await generateSubcontractorContractPDF({
      contractNumber: contract.contractNumber,
      name: contract.name,
      status: contract.status,
      contractValue: Number(contract.contractValue),
      currency: contract.currency,
      retentionPercentage: Number(contract.retentionPercentage),
      scopeTypes: contract.scopeTypes,
      scopeItems: contract.scopeItems,
      paymentTerms: contract.paymentTerms,
      termsAndConditions: contract.termsAndConditions,
      templateType: contract.templateType,
      notes: contract.notes,
      createdAt: contract.createdAt,
      submittedAt: contract.submittedAt,
      approvedAt: contract.approvedAt,
      project: { projectNumber: contract.project.projectNumber, name: contract.project.name },
      building: contract.building ? { designation: contract.building.designation, name: contract.building.name } : null,
      supplier: { supplierCode: contract.supplier.supplierCode, name: contract.supplier.name, rating: contract.supplier.rating, scopeOfApproval: contract.supplier.scopeOfApproval },
      createdBy: { name: contract.createdBy.name },
      approvedBy: contract.approvedBy ? { name: contract.approvedBy.name } : null,
      variations: variations.map(v => ({ variationNumber: v.variationNumber, description: v.description, amount: v.amount, status: v.status })),
      deductions: deductions.map(d => ({ description: d.description, amount: d.amount, deductionDate: d.deductionDate, status: d.status })),
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 max-lg:pt-20 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => router.push('/supply-chain/subcontractors')}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-xl bg-orange-100">
              <Handshake className="size-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-mono font-bold text-xl text-primary">{contract.contractNumber}</h1>
                <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{contract.name}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canEditFields && (
              <Button size="sm" variant="outline" onClick={openEditDialog} disabled={actionLoading}>
                <Pencil className="size-4 mr-1" />
                Edit
              </Button>
            )}
            {canSubmit && (
              <Button size="sm" onClick={() => handleAction('submit')} disabled={actionLoading} className="bg-amber-500 hover:bg-amber-600">
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 mr-1" />}
                Submit
              </Button>
            )}
            {canApprove && (
              <Button size="sm" onClick={() => handleAction('approve')} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-700">
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <ThumbsUp className="size-4 mr-1" />}
                Approve
              </Button>
            )}
            {canActivate && (
              <Button size="sm" onClick={() => handleAction('activate')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4 mr-1" />}
                Activate
              </Button>
            )}
            {canSuspend && (
              <Button size="sm" variant="outline" onClick={() => handleAction('suspend')} disabled={actionLoading} className="text-orange-700 border-orange-300">
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <PauseCircle className="size-4 mr-1" />}
                Suspend
              </Button>
            )}
            {canResume && (
              <Button size="sm" onClick={() => handleAction('activate')} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4 mr-1" />}
                Resume
              </Button>
            )}
            {canComplete && (
              <Button size="sm" onClick={() => handleAction('complete')} disabled={actionLoading} className="bg-teal-600 hover:bg-teal-700">
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4 mr-1" />}
                Complete
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" onClick={() => handleAction('cancel')} disabled={actionLoading} className="text-rose-600 border-rose-300">
                {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4 mr-1" />}
                Cancel
              </Button>
            )}
            {canDeleteContract && (
              <Button size="sm" variant="outline" onClick={() => { setDeleteReason(''); setDeleteDialog(true); }} disabled={actionLoading} className="text-rose-700 border-rose-300 hover:bg-rose-50">
                <Trash2 className="size-4 mr-1" />
                Delete
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="size-4 mr-1" />
              Print
            </Button>
            <Button size="sm" variant="ghost" onClick={fetchContract} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Info Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Contract details */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contract Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                {[
                  { label: 'Project', value: `${contract.project.projectNumber} — ${contract.project.name}`, icon: <FolderOpen className="size-3.5" /> },
                  { label: 'Building', value: contract.building ? `${contract.building.designation} — ${contract.building.name}` : 'Full Project', icon: <Building2 className="size-3.5" /> },
                  { label: 'Scope Types', value: (contract.scopeTypes as string[]).map(s => s.replace(/_/g, ' ')).join(', ') },
                  { label: 'Contract Value', value: fmt(Number(contract.contractValue), contract.currency) },
                  { label: 'Retention', value: `${contract.retentionPercentage}%` },
                  { label: 'Currency', value: contract.currency },
                  { label: 'Submitted', value: fmtDate(contract.submittedAt) },
                  { label: 'Approved', value: fmtDate(contract.approvedAt) },
                  { label: 'Approved By', value: contract.approvedBy?.name ?? '—' },
                  { label: 'Created By', value: contract.createdBy.name },
                  { label: 'Created', value: fmtDate(contract.createdAt) },
                  { label: 'T&C Template', value: contract.templateType?.replace(/_/g, ' ') ?? 'Custom' },
                ].map(row => (
                  <div key={row.label}>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {row.icon}
                      {row.label}
                    </p>
                    <p className="font-medium mt-0.5">{row.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Supplier card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Handshake className="size-4 text-orange-600" />
                Subcontractor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-bold">{contract.supplier.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{contract.supplier.supplierCode}</p>
              </div>
              {contract.supplier.category && (
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm">{contract.supplier.category}</p>
                </div>
              )}
              {contract.supplier.rating && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  Rating: {contract.supplier.rating}
                </Badge>
              )}
              {contract.supplier.scopeOfApproval && (
                <div>
                  <p className="text-xs text-muted-foreground">Approved Scope</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">{contract.supplier.scopeOfApproval}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Progress ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" />
              Progress & Financials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Contract Value', value: fmt(Number(contract.contractValue), contract.currency), cls: 'text-primary' },
                { label: 'Certified to Date', value: latestCert ? fmt(Number(latestCert.cumulativeAmount), contract.currency) : '—', cls: 'text-blue-600' },
                { label: 'Total Paid', value: fmt(totalPaid, contract.currency), cls: 'text-emerald-600' },
                { label: 'Outstanding (Approved)', value: fmt(totalApproved, contract.currency), cls: 'text-amber-600' },
              ].map(kpi => (
                <div key={kpi.label} className="text-center p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                  <p className={`font-bold text-sm ${kpi.cls}`}>{kpi.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Overall Progress</span>
                <span className="font-semibold">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* ── Scope Items ── */}
        {contract.scopeItems && Array.isArray(contract.scopeItems) && contract.scopeItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scope of Work</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Scope</TableHead>
                      <TableHead className="text-right">Original Qty</TableHead>
                      <TableHead>Orig. Unit</TableHead>
                      <TableHead className="text-right">Contract Qty</TableHead>
                      <TableHead>Contract Unit</TableHead>
                      <TableHead className="text-right">Unit Rate</TableHead>
                      <TableHead className="text-right">Subtotal ({contract.currency})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(contract.scopeItems as Array<Record<string, unknown>>).map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{String(item.scopeLabel ?? item.scopeType ?? '—')}</TableCell>
                        <TableCell className="text-right">{item.originalQuantity != null ? String(item.originalQuantity) : '—'}</TableCell>
                        <TableCell>{item.originalUnit ? String(item.originalUnit) : '—'}</TableCell>
                        <TableCell className="text-right">{item.contractQuantity != null ? String(item.contractQuantity) : '—'}</TableCell>
                        <TableCell>{item.contractUnit ? String(item.contractUnit) : '—'}</TableCell>
                        <TableCell className="text-right">{item.unitRate != null ? Number(item.unitRate).toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: 2 }) : '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{item.subtotal != null ? Number(item.subtotal).toLocaleString('en-SA-u-ca-gregory', { maximumFractionDigits: 2 }) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Payment Certificates ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="size-4" />
                  Payment Progress Certificates
                </CardTitle>
                <CardDescription>
                  {contract.paymentCertificates.length} certificate{contract.paymentCertificates.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              {canAddCert && (
                <Button size="sm" onClick={() => setCertDialog(true)} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="size-4 mr-1" />
                  New Certificate
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {contract.paymentCertificates.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <DollarSign className="size-10 mx-auto mb-2 opacity-20" />
                <p>No payment certificates yet</p>
                {canAddCert && (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setCertDialog(true)}>
                    <Plus className="size-4 mr-1" /> Create First Certificate
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Cert #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Current %</TableHead>
                      <TableHead className="text-right">Cumulative %</TableHead>
                      <TableHead className="text-right">Net Due ({contract.currency})</TableHead>
                      <TableHead className="text-right">Retention</TableHead>
                      <TableHead>Dolibarr Ref</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.paymentCertificates.map(cert => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-mono text-xs font-semibold text-primary">{cert.certificateNumber}</TableCell>
                        <TableCell className="text-sm">{fmtDate(cert.certificateDate)}</TableCell>
                        <TableCell className="text-right">{Number(cert.currentPercentage).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-semibold">{Number(cert.cumulativePercentage).toFixed(1)}%</TableCell>
                        <TableCell className="text-right">{fmt(Number(cert.netAmountDue), contract.currency)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">{fmt(Number(cert.retentionAmount), contract.currency)}</TableCell>
                        <TableCell>
                          {cert.dolibarrInvoiceRef ? (
                            <span className="text-xs font-mono text-blue-600 flex items-center gap-1">
                              <ExternalLink className="size-3" />
                              {cert.dolibarrInvoiceRef}
                            </span>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${CERT_STATUS_CFG[cert.status] ?? ''}`}>
                            {cert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {canCertCreate && cert.status === 'DRAFT' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCertAction(cert.id, 'submit')}>
                                <Send className="size-3 mr-1" /> Submit
                              </Button>
                            )}
                            {canCertApprove && cert.status === 'SUBMITTED' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-300" onClick={() => handleCertAction(cert.id, 'approve')}>
                                <ThumbsUp className="size-3 mr-1" /> Approve
                              </Button>
                            )}
                            {canCertApprove && cert.status === 'APPROVED' && (
                              <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-300" onClick={() => handleCertAction(cert.id, 'mark_paid')}>
                                <CheckCircle2 className="size-3 mr-1" /> Mark Paid
                              </Button>
                            )}
                            {canCertCreate && cert.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                                onClick={() => openDeleteCertDialog(cert.id, cert.certificateNumber)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Payment Terms ── */}
        {contract.paymentTerms && Array.isArray(contract.paymentTerms) && contract.paymentTerms.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Milestones</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Milestone</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Amount ({contract.currency})</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(contract.paymentTerms as Array<Record<string, unknown>>).map((m, i) => (
                    <TableRow key={i}>
                      <TableCell>{String(m.milestone ?? '—')}</TableCell>
                      <TableCell className="text-right">{m.percentage != null ? `${m.percentage}%` : '—'}</TableCell>
                      <TableCell className="text-right">{m.amount != null ? fmt(Number(m.amount), contract.currency) : '—'}</TableCell>
                      <TableCell>{m.dueDate ? fmtDate(String(m.dueDate)) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── Terms & Conditions ── */}
        {contract.termsAndConditions && (
          <Card>
            <CardHeader className="pb-2">
              <button
                className="flex items-center justify-between w-full text-left"
                onClick={() => setTcCollapsed(v => !v)}
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="size-4" />
                  Terms & Conditions
                </CardTitle>
                {tcCollapsed ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronUp className="size-4 text-muted-foreground" />}
              </button>
            </CardHeader>
            {!tcCollapsed && (
              <CardContent>
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground bg-muted/30 p-4 rounded-xl border">
                  {contract.termsAndConditions}
                </pre>
              </CardContent>
            )}
          </Card>
        )}

        {/* ── Notes ── */}
        {contract.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes & Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground">{contract.notes}</pre>
            </CardContent>
          </Card>
        )}

        {/* ── Variations ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-blue-600" />
                Variations
              </CardTitle>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => { setVarDesc(''); setVarAmount(''); setVarNotes(''); setVarDialog(true); }}>
                  <Plus className="size-4 mr-1" /> Add Variation
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className={variations.length === 0 ? undefined : 'p-0'}>
            {variations.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No variations recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variations.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs">{v.variationNumber}</TableCell>
                      <TableCell>{v.description}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(v.amount, contract.currency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={v.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : v.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-amber-100 text-amber-700 border-amber-300'}>
                          {v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{v.createdBy.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {variations.length > 0 && (
              <div className="px-4 py-3 bg-muted/20 border-t flex justify-end">
                <span className="text-sm font-semibold">Total Variations: {fmt(variations.reduce((s, v) => s + v.amount, 0), contract.currency)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Deductions ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Flag className="size-4 text-rose-600" />
                Deductions
              </CardTitle>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => { setDedDesc(''); setDedAmount(''); setDedDate(new Date().toISOString().split('T')[0]); setDedReason(''); setDedDialog(true); }}>
                  <Plus className="size-4 mr-1" /> Add Deduction
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className={deductions.length === 0 ? undefined : 'p-0'}>
            {deductions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No deductions recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{fmtDate(d.deductionDate)}</TableCell>
                      <TableCell>{d.description}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.reason ?? '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(d.amount, contract.currency)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={d.status === 'APPLIED' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : d.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-amber-100 text-amber-700 border-amber-300'}>
                          {d.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {deductions.length > 0 && (
              <div className="px-4 py-3 bg-muted/20 border-t flex justify-end">
                <span className="text-sm font-semibold">Total Deductions: {fmt(deductions.reduce((s, d) => s + d.amount, 0), contract.currency)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Add Variation Dialog ── */}
      <Dialog open={varDialog} onOpenChange={setVarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Variation</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea value={varDesc} onChange={e => setVarDesc(e.target.value)} placeholder="Variation description…" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ({contract.currency}) <span className="text-destructive">*</span></Label>
              <Input type="number" value={varAmount} onChange={e => setVarAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={varNotes} onChange={e => setVarNotes(e.target.value)} placeholder="Additional notes…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVarDialog(false)} disabled={varSaving}>Cancel</Button>
            <Button disabled={varSaving || !varDesc || !varAmount} onClick={async () => {
              setVarSaving(true);
              const res = await fetch(`/api/subcontractor-contracts/${id}/variations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: varDesc, amount: Number(varAmount), notes: varNotes || null }),
              });
              if (res.ok) { setVarDialog(false); fetchVariations(); }
              setVarSaving(false);
            }}>
              {varSaving ? 'Saving…' : 'Add Variation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Deduction Dialog ── */}
      <Dialog open={dedDialog} onOpenChange={setDedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Deduction</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Input value={dedDesc} onChange={e => setDedDesc(e.target.value)} placeholder="Deduction description…" />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ({contract.currency}) <span className="text-destructive">*</span></Label>
              <Input type="number" value={dedAmount} onChange={e => setDedAmount(e.target.value)} placeholder="0.00" min="0.01" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={dedDate} onChange={e => setDedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={dedReason} onChange={e => setDedReason(e.target.value)} placeholder="Reason for deduction…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDedDialog(false)} disabled={dedSaving}>Cancel</Button>
            <Button disabled={dedSaving || !dedDesc || !dedAmount} onClick={async () => {
              setDedSaving(true);
              const res = await fetch(`/api/subcontractor-contracts/${id}/deductions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: dedDesc, amount: Number(dedAmount), deductionDate: dedDate, reason: dedReason || null }),
              });
              if (res.ok) { setDedDialog(false); fetchDeductions(); }
              setDedSaving(false);
            }}>
              {dedSaving ? 'Saving…' : 'Add Deduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Certificate Dialog ── */}
      <Dialog open={certDialog} onOpenChange={setCertDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="size-5 text-orange-600" />
              New Payment Certificate
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {certError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0" />
                {certError}
              </div>
            )}

            {latestCert && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
                <p className="font-semibold mb-1">Previous certificate: {latestCert.certificateNumber}</p>
                <p>Cumulative: {Number(latestCert.cumulativePercentage).toFixed(1)}% — {fmt(Number(latestCert.cumulativeAmount), contract.currency)}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Certificate Date *</Label>
                <Input type="date" value={certDate} onChange={e => setCertDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Current Progress % *</Label>
                <Input
                  type="number"
                  min={0}
                  max={100 - progress}
                  step={0.1}
                  placeholder={`0 – ${(100 - progress).toFixed(1)}`}
                  value={certPct}
                  onChange={e => setCertPct(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Period From</Label>
                <Input type="date" value={certPeriodFrom} onChange={e => setCertPeriodFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Period To</Label>
                <Input type="date" value={certPeriodTo} onChange={e => setCertPeriodTo(e.target.value)} />
              </div>
            </div>

            {certPct && Number(certPct) > 0 && (
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm space-y-1">
                <p className="font-semibold">Calculated Amounts</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <span className="text-orange-600">Current amount:</span>
                  <span className="font-medium text-right">{fmt((Number(certPct) / 100) * Number(contract.contractValue), contract.currency)}</span>
                  <span className="text-orange-600">Retention ({contract.retentionPercentage}%):</span>
                  <span className="font-medium text-right">{fmt((Number(certPct) / 100) * Number(contract.contractValue) * Number(contract.retentionPercentage) / 100, contract.currency)}</span>
                  <span className="text-orange-600">Net due:</span>
                  <span className="font-bold text-right">{fmt((Number(certPct) / 100) * Number(contract.contractValue) * (1 - Number(contract.retentionPercentage) / 100), contract.currency)}</span>
                  <span className="text-orange-600">Cumulative %:</span>
                  <span className="font-bold text-right">{(progress + Number(certPct)).toFixed(1)}%</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Dolibarr Invoice Reference</Label>
              <Input
                placeholder="e.g. FINV2026-0042"
                value={certDoliRef}
                onChange={e => setCertDoliRef(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dolibarr Invoice ID (numeric)</Label>
              <Input
                type="number"
                placeholder="e.g. 142"
                value={certDoliId}
                onChange={e => setCertDoliId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes about this certificate…"
                value={certNotes}
                onChange={e => setCertNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialog(false)} disabled={certSaving}>Cancel</Button>
            <Button
              onClick={handleCreateCert}
              disabled={certSaving || !certDate || !certPct || Number(certPct) <= 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {certSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Create Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Contract Dialog ── */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit Contract
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="size-4 shrink-0" />
                {editError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Contract Value *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Retention % *</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={editRetention}
                  onChange={e => setEditRetention(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input
                  value={editCurrency}
                  onChange={e => setEditCurrency(e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="SAR"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Optional internal notes…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} disabled={editSaving}>Cancel</Button>
            <Button
              onClick={handleEdit}
              disabled={editSaving || !editValue || !editRetention}
            >
              {editSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Contract Dialog ── */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="size-5" />
              Delete Contract
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will permanently remove <span className="font-semibold text-foreground">{contract.contractNumber}</span> from the system. This action cannot be undone.
            </p>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Textarea
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                rows={3}
                placeholder="Why is this contract being deleted?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={deleteLoading}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Delete Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Certificate Dialog ── */}
      <Dialog open={deleteCertDialog} onOpenChange={setDeleteCertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="size-5" />
              Delete Certificate
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Deleting certificate <span className="font-semibold text-foreground font-mono">{deleteCertNumber}</span>. This action cannot be undone.
            </p>
            <div className="space-y-1.5">
              <Label>Justification *</Label>
              <Textarea
                value={deleteCertReason}
                onChange={e => setDeleteCertReason(e.target.value)}
                rows={3}
                placeholder="Reason for deleting this payment certificate…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCertDialog(false)} disabled={deleteCertLoading}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCert}
              disabled={deleteCertLoading || !deleteCertReason.trim()}
            >
              {deleteCertLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Delete Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
