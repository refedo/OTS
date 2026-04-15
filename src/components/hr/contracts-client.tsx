'use client';

/**
 * 18.14.0 — Contracts & Documents Management
 * Health insurance, medical insurance, Iqamas, car registrations,
 * legal documents, etc. with Hijri date support and expiry notifications.
 */

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileText, Plus, Search, Loader2, Edit2, Trash2, AlertCircle,
  Calendar, Building2, User, Clock, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { gregorianToHijri, hijriToGregorian } from '@/lib/utils/hijri';

// ─── Types ───────────────────────────────────────────────────────────────────

type ContractType =
  | 'HEALTH_INSURANCE' | 'MEDICAL_INSURANCE' | 'IQAMA' | 'CAR_REGISTRATION'
  | 'VEHICLE_LICENSE' | 'PROFESSIONAL_LICENSE' | 'COMMERCIAL_REGISTRATION'
  | 'LEGAL_DOCUMENT' | 'OTHER';

type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'PENDING_RENEWAL' | 'CANCELLED';

interface ContractRow {
  id: string;
  contractNumber: string;
  title: string;
  type: ContractType;
  employeeId: string | null;
  issuingAuthority: string | null;
  referenceNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  expiryDateHijri: string | null;
  status: ContractStatus;
  notifyDaysBefore: number;
  description: string | null;
  daysUntilExpiry: number | null;
  employee: { id: string; fullNameEn: string; employmentId: string } | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

interface EmployeeOption {
  id: string;
  fullNameEn: string;
  employmentId: string;
}

interface Props {
  canManage: boolean;
  employees: EmployeeOption[];
  initialContracts: ContractRow[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTRACT_TYPES: { value: ContractType; label: string; color: string }[] = [
  { value: 'HEALTH_INSURANCE',      label: 'Health Insurance',        color: 'emerald' },
  { value: 'MEDICAL_INSURANCE',     label: 'Medical Insurance',       color: 'sky' },
  { value: 'IQAMA',                 label: 'Iqama',                   color: 'violet' },
  { value: 'CAR_REGISTRATION',      label: 'Car Registration',        color: 'amber' },
  { value: 'VEHICLE_LICENSE',       label: 'Vehicle License',         color: 'orange' },
  { value: 'PROFESSIONAL_LICENSE',  label: 'Professional License',    color: 'blue' },
  { value: 'COMMERCIAL_REGISTRATION', label: 'Commercial Registration', color: 'indigo' },
  { value: 'LEGAL_DOCUMENT',        label: 'Legal Document',          color: 'rose' },
  { value: 'OTHER',                 label: 'Other',                   color: 'slate' },
];

const STATUS_CONFIG: Record<ContractStatus, { label: string; cls: string }> = {
  ACTIVE:          { label: 'Active',           cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  EXPIRED:         { label: 'Expired',          cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  PENDING_RENEWAL: { label: 'Pending Renewal',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  CANCELLED:       { label: 'Cancelled',        cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function typeBadge(type: ContractType) {
  const t = CONTRACT_TYPES.find(x => x.value === type);
  if (!t) return null;
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    sky: 'bg-sky-100 text-sky-700 border-sky-200',
    violet: 'bg-violet-100 text-violet-700 border-violet-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', colorMap[t.color] ?? colorMap.slate)}>
      {t.label}
    </span>
  );
}

function daysLeftBadge(days: number | null, status: ContractStatus) {
  if (status === 'CANCELLED') return <span className="text-xs text-slate-400">—</span>;
  if (status === 'EXPIRED' || (days !== null && days < 0)) {
    return <span className="text-xs font-semibold text-rose-600">Expired</span>;
  }
  if (days === null) return <span className="text-xs text-slate-400">No expiry</span>;
  if (days <= 7) return <span className="text-xs font-bold text-rose-600">{days}d left</span>;
  if (days <= 30) return <span className="text-xs font-semibold text-amber-600">{days}d left</span>;
  return <span className="text-xs text-emerald-600">{days}d left</span>;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: '',
  type: '' as ContractType | '',
  employeeId: '',
  issuingAuthority: '',
  referenceNumber: '',
  issueDate: '',
  expiryDate: '',
  expiryDateHijri: '',
  status: 'ACTIVE' as ContractStatus,
  notifyDaysBefore: 30,
  description: '',
};

// ─── Main component ───────────────────────────────────────────────────────────

export function ContractsClient({ canManage, employees, initialContracts }: Props) {
  const [contracts, setContracts] = useState<ContractRow[]>(initialContracts);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('__all__');
  const [filterStatus, setFilterStatus] = useState('__all__');

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editContract, setEditContract] = useState<ContractRow | null>(null);
  const [deleteContract, setDeleteContract] = useState<ContractRow | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const loadContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType !== '__all__') params.set('type', filterType);
      if (filterStatus !== '__all__') params.set('status', filterStatus);

      const res = await fetch(`/api/hr/contracts?${params}`);
      if (res.ok) setContracts(await res.json());
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus]);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  // ── KPIs — derived from live contracts state so they stay current after filter changes ──

  const kpiActive  = contracts.filter(c => c.status === 'ACTIVE').length;
  const kpiExp7    = contracts.filter(c => c.status === 'ACTIVE' && c.daysUntilExpiry !== null && c.daysUntilExpiry <= 7 && c.daysUntilExpiry >= 0).length;
  const kpiExp30   = contracts.filter(c => c.status === 'ACTIVE' && c.daysUntilExpiry !== null && c.daysUntilExpiry <= 30 && c.daysUntilExpiry >= 0).length;
  const kpiExpired = contracts.filter(c => c.status === 'EXPIRED').length;

  // ── Hijri helpers ──────────────────────────────────────────────────────────

  function convertGregorianToHijri() {
    if (!form.expiryDate) return;
    setForm(f => ({ ...f, expiryDateHijri: gregorianToHijri(new Date(f.expiryDate)) }));
  }

  function convertHijriToGregorian() {
    if (!form.expiryDateHijri) return;
    const g = hijriToGregorian(form.expiryDateHijri);
    if (!g) return;
    const iso = g.toISOString().split('T')[0];
    setForm(f => ({ ...f, expiryDate: iso }));
  }

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...EMPTY_FORM });
    setCreateOpen(true);
  }

  function openEdit(c: ContractRow) {
    setForm({
      title: c.title,
      type: c.type,
      employeeId: c.employeeId ?? '',
      issuingAuthority: c.issuingAuthority ?? '',
      referenceNumber: c.referenceNumber ?? '',
      issueDate: c.issueDate ? c.issueDate.split('T')[0] : '',
      expiryDate: c.expiryDate ? c.expiryDate.split('T')[0] : '',
      expiryDateHijri: c.expiryDateHijri ?? '',
      status: c.status,
      notifyDaysBefore: c.notifyDaysBefore,
      description: c.description ?? '',
    });
    setEditContract(c);
  }

  async function handleSave() {
    if (!form.title || !form.type) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        type: form.type || undefined,
        employeeId: form.employeeId || null,
        issuingAuthority: form.issuingAuthority || null,
        referenceNumber: form.referenceNumber || null,
        issueDate: form.issueDate || null,
        expiryDate: form.expiryDate || null,
        expiryDateHijri: form.expiryDateHijri || null,
        status: form.status,
        notifyDaysBefore: form.notifyDaysBefore,
        description: form.description || null,
      };

      const url = editContract ? `/api/hr/contracts/${editContract.id}` : '/api/hr/contracts';
      const method = editContract ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCreateOpen(false);
        setEditContract(null);
        await loadContracts();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteContract || !deleteReason.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hr/contracts/${deleteContract.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteReason }),
      });
      if (res.ok) {
        setDeleteContract(null);
        setDeleteReason('');
        await loadContracts();
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Contracts & Documents</h1>
              </div>
              <p className="text-amber-100 text-sm">
                Manage health insurance, Iqamas, car registrations, legal documents, and more — with Hijri date support and expiry alerts.
              </p>
            </div>
            {canManage && (
              <Button
                onClick={openCreate}
                className="shrink-0 bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Contract
              </Button>
            )}
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total Active</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{kpiActive}</p>
            <p className="text-xs text-amber-500 mt-0.5">active contracts</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Expiring in 7 days</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{kpiExp7}</p>
            <p className="text-xs text-rose-500 mt-0.5">urgent attention needed</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-orange-50 to-white border-orange-200 p-4 shadow-sm">
            <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Expiring in 30 days</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">{kpiExp30}</p>
            <p className="text-xs text-orange-500 mt-0.5">plan for renewal</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Expired</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{kpiExpired}</p>
            <p className="text-xs text-slate-400 mt-0.5">require renewal</p>
          </div>
        </div>

        {/* Filters + table */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b bg-slate-50/50">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search title, reference, issuing authority, employee…"
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-44 shrink-0">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {CONTRACT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 shrink-0">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="PENDING_RENEWAL">Pending Renewal</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileText className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No contracts found</p>
                <p className="text-sm mt-1">
                  {canManage ? 'Click "New Contract" to add one.' : 'No contracts have been added yet.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee / Scope</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Expiry</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Days Left</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    {canManage && (
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-slate-400">{c.contractNumber}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-slate-800 truncate">{c.title}</p>
                        {c.referenceNumber && (
                          <p className="text-xs text-slate-400 mt-0.5">Ref: {c.referenceNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{typeBadge(c.type)}</td>
                      <td className="px-4 py-3">
                        {c.employee ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <div>
                              <p className="text-sm text-slate-700">{c.employee.fullNameEn}</p>
                              <p className="text-xs text-slate-400">{c.employee.employmentId}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs">Company</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.expiryDate ? (
                          <div>
                            <p className="text-sm text-slate-700">{formatDate(c.expiryDate)}</p>
                            {c.expiryDateHijri && (
                              <p className="text-xs text-slate-400 mt-0.5">{c.expiryDateHijri} AH</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{daysLeftBadge(c.daysUntilExpiry, c.status)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', STATUS_CONFIG[c.status]?.cls)}>
                          {STATUS_CONFIG[c.status]?.label}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => { setDeleteContract(c); setDeleteReason(''); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={createOpen || !!editContract} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditContract(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editContract ? 'Edit Contract' : 'New Contract'}</DialogTitle>
            <DialogDescription>
              {editContract ? `Editing ${editContract.contractNumber}` : 'Add a new contract or document to the registry.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Title */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Title <span className="text-rose-500">*</span></Label>
              <Input
                placeholder="e.g. Group Health Insurance – 2026"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Document Type <span className="text-rose-500">*</span></Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ContractType }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {CONTRACT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee (optional) */}
            <div className="space-y-1.5">
              <Label>Employee <span className="text-xs text-slate-400">(leave blank for company-level)</span></Label>
              <Select value={form.employeeId || '__none__'} onValueChange={v => setForm(f => ({ ...f, employeeId: v === '__none__' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Company-level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Company-level</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.fullNameEn} ({e.employmentId})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issuing Authority */}
            <div className="space-y-1.5">
              <Label>Issuing Authority</Label>
              <Input
                placeholder="e.g. Ministry of Interior"
                value={form.issuingAuthority}
                onChange={e => setForm(f => ({ ...f, issuingAuthority: e.target.value }))}
              />
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5">
              <Label>Reference / Policy Number</Label>
              <Input
                placeholder="e.g. POL-2026-0012"
                value={form.referenceNumber}
                onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
              />
            </div>

            {/* Issue Date */}
            <div className="space-y-1.5">
              <Label>Issue Date</Label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
              />
            </div>

            {/* Expiry Date (Gregorian) */}
            <div className="space-y-1.5">
              <Label>Expiry Date (Gregorian)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  type="button" variant="outline" size="sm"
                  className="px-2 shrink-0 text-xs"
                  onClick={convertGregorianToHijri}
                  title="Convert to Hijri"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  → Hijri
                </Button>
              </div>
            </div>

            {/* Expiry Date (Hijri) */}
            <div className="space-y-1.5">
              <Label>Expiry Date (Hijri)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 1447/09/15"
                  value={form.expiryDateHijri}
                  onChange={e => setForm(f => ({ ...f, expiryDateHijri: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  type="button" variant="outline" size="sm"
                  className="px-2 shrink-0 text-xs"
                  onClick={convertHijriToGregorian}
                  title="Convert to Gregorian"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  → Gregorian
                </Button>
              </div>
              <p className="text-xs text-slate-400">Format: YYYY/MM/DD (Hijri)</p>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ContractStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING_RENEWAL">Pending Renewal</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notify days before */}
            <div className="space-y-1.5">
              <Label>Notify days before expiry</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={form.notifyDaysBefore}
                onChange={e => setForm(f => ({ ...f, notifyDaysBefore: parseInt(e.target.value) || 30 }))}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Description / Notes</Label>
              <Textarea
                placeholder="Additional notes about this contract…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditContract(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.type}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editContract ? 'Save Changes' : 'Create Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteContract} onOpenChange={(o) => { if (!o) { setDeleteContract(null); setDeleteReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contract</DialogTitle>
            <DialogDescription>
              This will soft-delete <strong>{deleteContract?.title}</strong>. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason <span className="text-rose-500">*</span></Label>
            <Textarea
              placeholder="Reason for deletion…"
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteContract(null); setDeleteReason(''); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving || !deleteReason.trim()}
              onClick={handleDelete}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContractsClient;
