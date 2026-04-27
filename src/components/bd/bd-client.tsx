'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Handshake, Search, Plus, Trash2, Edit, FileText,
  MoreVertical, ChevronLeft, ChevronRight, Loader2, X, Building2,
  Mail, Phone, User, FileCheck, AlertCircle, Archive,
  Inbox, ExternalLink, Eye, EyeOff, Hash, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ArchiveEntry = {
  id: string;
  companyId: string;
  entryType: string;
  content: string | null;
  updatedAt: string;
  company?: { id: string; name: string };
};

type BdDocument = {
  id: string;
  companyId: string;
  title: string;
  fileUrl: string | null;
  status: string;
  submittedAt: string;
  company?: { id: string; name: string };
};

type BdRequest = {
  id: string;
  companyId: string;
  title: string;
  requestType: string | null;
  status: string;
  receivedAt: string;
  company?: { id: string; name: string };
};

type BdCompany = {
  id: string;
  name: string;
  logoUrl: string | null;
  vendorId: string | null;
  portalUsername: string | null;
  portalPassword: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  registrationStatus: string;
  registrationDate: string | null;
  registrationExpiry: string | null;
  whatNext: string | null;
  notes: string | null;
  updatedAt: string;
  createdById: string | null;
  _count: { documents: number; requests: number };
  archiveEntries: ArchiveEntry[];
};

interface BdClientProps {
  initialCompanies: BdCompany[];
  initialDocuments: BdDocument[];
  initialRequests: BdRequest[];
  initialArchiveEntries: ArchiveEntry[];
  totalDocs: number;
  totalRequests: number;
  canManage: boolean;
  currentUserId: string;
  currentUserRole: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ARCHIVE_TYPES = [
  'GENERAL_INFO',
  'COMMUNICATION_HISTORY',
  'NOTES',
  'EVALUATION_HISTORY',
];

const ARCHIVE_TYPE_LABELS: Record<string, string> = {
  GENERAL_INFO: 'General Information',
  COMMUNICATION_HISTORY: 'Communication History',
  NOTES: 'Notes',
  EVALUATION_HISTORY: 'Evaluation History',
};

const PAGE_SIZE = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function regStatusBadge(status: string) {
  const map: Record<string, string> = {
    REGISTERED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-300',
    NOT_STARTED: 'bg-rose-100 text-rose-800 border-rose-300',
    CLOSED_INACTIVE: 'bg-slate-100 text-slate-700 border-slate-300',
  };
  const labels: Record<string, string> = {
    REGISTERED: 'Registered',
    IN_PROGRESS: 'In Progress',
    NOT_STARTED: 'Not Started',
    CLOSED_INACTIVE: 'Closed / Inactive',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', map[status] ?? 'bg-slate-100 text-slate-700 border-slate-300')}>
      {labels[status] ?? status}
    </span>
  );
}

function docStatusBadge(status: string) {
  const map: Record<string, string> = {
    SUBMITTED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
    APPROVED: 'bg-blue-100 text-blue-800 border-blue-300',
    REJECTED: 'bg-rose-100 text-rose-800 border-rose-300',
  };
  const labels: Record<string, string> = {
    SUBMITTED: 'Submitted',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', map[status] ?? 'bg-slate-100 text-slate-700 border-slate-300')}>
      {labels[status] ?? status}
    </span>
  );
}

function reqStatusBadge(status: string) {
  const map: Record<string, string> = {
    NEW: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    IN_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-300',
    CLOSED: 'bg-slate-100 text-slate-700 border-slate-300',
  };
  const labels: Record<string, string> = {
    NEW: 'New',
    IN_REVIEW: 'In Review',
    IN_PROGRESS: 'In Progress',
    CLOSED: 'Closed',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', map[status] ?? 'bg-slate-100 text-slate-700 border-slate-300')}>
      {labels[status] ?? status}
    </span>
  );
}

function CompanyAvatar({ company }: { company: BdCompany }) {
  if (company.logoUrl) {
    return (
      <img src={company.logoUrl} alt={company.name} className="h-9 w-9 rounded-full object-cover border border-slate-200 flex-shrink-0" />
    );
  }
  const initials = company.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold border border-sky-200 flex-shrink-0">
      {initials}
    </div>
  );
}

function fmt(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-10 text-center text-slate-400">
      <Icon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
      <span>Showing {from} to {to} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn('w-7 h-7 rounded text-xs font-medium', p === page ? 'bg-sky-600 text-white' : 'hover:bg-slate-100')}
          >
            {p}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === pages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Company Form Dialog ──────────────────────────────────────────────────────

type CompanyFormData = {
  name: string;
  logoUrl: string;
  vendorId: string;
  portalUsername: string;
  portalPassword: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  registrationStatus: string;
  registrationDate: string;
  registrationExpiry: string;
  whatNext: string;
  notes: string;
};

const EMPTY_COMPANY_FORM: CompanyFormData = {
  name: '', logoUrl: '', vendorId: '', portalUsername: '', portalPassword: '',
  contactName: '', contactEmail: '', contactPhone: '',
  registrationStatus: 'NOT_STARTED', registrationDate: '', registrationExpiry: '',
  whatNext: '', notes: '',
};

function CompanyDialog({
  open, onClose, initial, onSave, canSeePassword,
}: {
  open: boolean;
  onClose: () => void;
  initial: CompanyFormData;
  onSave: (data: CompanyFormData) => Promise<void>;
  canSeePassword: boolean;
}) {
  const [form, setForm] = useState<CompanyFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => { setForm(initial); setError(''); }, [open, initial]);

  const field = (key: keyof CompanyFormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Company name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !saving && !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.name ? 'Edit Company' : 'Add Company'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="c-name">Company Name *</Label>
              <Input id="c-name" {...field('name')} placeholder="e.g. Saudi Aramco" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="c-logo">Logo URL</Label>
              <Input id="c-logo" {...field('logoUrl')} placeholder="https://..." />
            </div>

            {/* ── Vendor credentials ── */}
            <div className="col-span-2 border-t pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Vendor Portal</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="c-vid" className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400" /> Vendor ID#
                  </Label>
                  <Input id="c-vid" {...field('vendorId')} placeholder="e.g. VND-00123" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-uname" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Username
                  </Label>
                  <Input id="c-uname" {...field('portalUsername')} placeholder="portal username" autoComplete="off" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="c-pwd" className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-slate-400" /> Password
                  </Label>
                  {canSeePassword ? (
                    <div className="relative">
                      <Input
                        id="c-pwd"
                        type={showPassword ? 'text' : 'password'}
                        {...field('portalPassword')}
                        placeholder="portal password"
                        autoComplete="new-password"
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-slate-50 text-slate-400 text-xs select-none">
                      <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                      Restricted — visible to creator &amp; CEO only
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="c-cname">Contact Name</Label>
              <Input id="c-cname" {...field('contactName')} placeholder="John Doe" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-cemail">Contact Email</Label>
              <Input id="c-cemail" type="email" {...field('contactEmail')} placeholder="john@company.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-cphone">Contact Phone</Label>
              <Input id="c-cphone" {...field('contactPhone')} placeholder="+966 5x xxx xxxx" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-status">Registration Status</Label>
              <select id="c-status" {...field('registrationStatus')} className="w-full h-9 px-2 rounded-md border bg-background text-sm">
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REGISTERED">Registered</option>
                <option value="CLOSED_INACTIVE">Closed / Inactive</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-rdate">Registration Date</Label>
              <Input id="c-rdate" type="date" {...field('registrationDate')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="c-expiry">Registration Expiry</Label>
              <Input id="c-expiry" type="date" {...field('registrationExpiry')} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="c-whatnext">What&apos;s Next / Required</Label>
              <Textarea id="c-whatnext" {...field('whatNext')} rows={2} placeholder="Next action items..." />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="c-notes">Notes</Label>
              <Textarea id="c-notes" {...field('notes')} rows={3} placeholder="Additional notes..." />
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Document Dialog ──────────────────────────────────────────────────────────

type DocFormData = { companyId: string; title: string; fileUrl: string; status: string; submittedAt: string };
const EMPTY_DOC_FORM: DocFormData = { companyId: '', title: '', fileUrl: '', status: 'SUBMITTED', submittedAt: '' };

function DocumentDialog({
  open, onClose, companies, initial, onSave,
}: {
  open: boolean; onClose: () => void; companies: BdCompany[];
  initial: DocFormData; onSave: (d: DocFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<DocFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => { setForm(initial); setError(''); }, [open, initial]);

  const field = (key: keyof DocFormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyId) { setError('Select a company'); return; }
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => !saving && !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Company *</Label>
            <select {...field('companyId')} className="w-full h-9 px-2 rounded-md border bg-background text-sm">
              <option value="">Select company…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Document Title *</Label>
            <Input {...field('title')} placeholder="e.g. VAT Certificate" />
          </div>
          <div className="space-y-1">
            <Label>File URL</Label>
            <Input {...field('fileUrl')} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <select {...field('status')} className="w-full h-9 px-2 rounded-md border bg-background text-sm">
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Submitted Date</Label>
              <Input type="date" {...field('submittedAt')} />
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Add Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Request Dialog ───────────────────────────────────────────────────────────

type ReqFormData = { companyId: string; title: string; requestType: string; status: string; receivedAt: string };
const EMPTY_REQ_FORM: ReqFormData = { companyId: '', title: '', requestType: 'RFQ', status: 'NEW', receivedAt: '' };

function RequestDialog({
  open, onClose, companies, initial, onSave,
}: {
  open: boolean; onClose: () => void; companies: BdCompany[];
  initial: ReqFormData; onSave: (d: ReqFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<ReqFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => { setForm(initial); setError(''); }, [open, initial]);

  const field = (key: keyof ReqFormData) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyId) { setError('Select a company'); return; }
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => !saving && !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Request</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Company *</Label>
            <select {...field('companyId')} className="w-full h-9 px-2 rounded-md border bg-background text-sm">
              <option value="">Select company…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input {...field('title')} placeholder="e.g. RFQ #2024-001 — Steel Beams" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <select {...field('requestType')} className="w-full h-9 px-2 rounded-md border bg-background text-sm">
                <option value="RFQ">RFQ</option>
                <option value="Inquiry">Inquiry</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select {...field('status')} className="w-full h-9 px-2 rounded-md border bg-background text-sm">
                <option value="NEW">New</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Received Date</Label>
            <Input type="date" {...field('receivedAt')} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : 'Add Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteDialog({
  open, onClose, companyName, onConfirm,
}: {
  open: boolean; onClose: () => void; companyName: string; onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true); setError('');
    try { await onConfirm(); onClose(); } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally { setDeleting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => !deleting && !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <Trash2 className="h-5 w-5" /> Delete Company
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600 py-2">
          Are you sure you want to delete <strong>{companyName}</strong>?
          This will soft-delete the company and hide it from all views.
        </p>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting…</> : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Archive Panel ────────────────────────────────────────────────────────────

function ArchivePanel({
  company, canManage, onRefresh,
}: {
  company: BdCompany | null;
  canManage: boolean;
  onRefresh: () => void;
}) {
  const [editType, setEditType] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  if (!company) {
    return <EmptyState icon={Archive} message="Select a company to view its archive" />;
  }

  const entries = ARCHIVE_TYPES.map(t => {
    const found = company.archiveEntries.find(e => e.entryType === t);
    return { type: t, content: found?.content ?? '', updatedAt: found?.updatedAt ?? null };
  });

  async function saveEntry(type: string, content: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/bd/companies/${company!.id}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryType: type, content }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setEditType(null);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {entries.map(entry => (
        <div key={entry.type} className="border rounded-lg p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700">{ARCHIVE_TYPE_LABELS[entry.type]}</p>
              {editType === entry.type ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={4}
                    className="text-sm"
                    placeholder="Enter content…"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEntry(entry.type, editContent)} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditType(null)} disabled={saving}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {entry.content || <span className="italic text-slate-400">No content yet</span>}
                </p>
              )}
              {entry.updatedAt && editType !== entry.type && (
                <p className="text-xs text-slate-400 mt-1">Updated {fmt(entry.updatedAt)}</p>
              )}
            </div>
            {canManage && editType !== entry.type && (
              <Button
                size="sm" variant="ghost"
                onClick={() => { setEditType(entry.type); setEditContent(entry.content); }}
                className="h-7 w-7 p-0 flex-shrink-0"
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BdClient({
  initialCompanies,
  initialDocuments,
  initialRequests,
  initialArchiveEntries,
  totalDocs,
  totalRequests,
  canManage,
  currentUserId,
  currentUserRole,
}: BdClientProps) {
  const router = useRouter();

  // State
  const [companies, setCompanies] = useState<BdCompany[]>(initialCompanies);
  const [documents, setDocuments] = useState<BdDocument[]>(initialDocuments);
  const [requests, setRequests] = useState<BdRequest[]>(initialRequests);
  const [archiveEntries] = useState<ArchiveEntry[]>(initialArchiveEntries);

  const [activeTab, setActiveTab] = useState<'companies' | 'archives' | 'documents' | 'requests'>('companies');
  const [search, setSearch] = useState('');
  const [companyPage, setCompanyPage] = useState(1);

  // Panel company pickers
  const [archivePanelCompanyId, setArchivePanelCompanyId] = useState<string>(initialCompanies[0]?.id ?? '');
  const [docPanelCompanyId, setDocPanelCompanyId] = useState<string>(initialCompanies[0]?.id ?? '');
  const [reqPanelCompanyId, setReqPanelCompanyId] = useState<string>(initialCompanies[0]?.id ?? '');

  // Tab filters
  const [archivesFilter, setArchivesFilter] = useState('');
  const [docsFilter, setDocsFilter] = useState('');
  const [reqsFilter, setReqsFilter] = useState('');

  // Dialogs
  const [companyDialog, setCompanyDialog] = useState<{ open: boolean; editId: string | null; form: CompanyFormData }>({
    open: false, editId: null, form: EMPTY_COMPANY_FORM,
  });
  const [docDialog, setDocDialog] = useState<{ open: boolean; form: DocFormData }>({ open: false, form: EMPTY_DOC_FORM });
  const [reqDialog, setReqDialog] = useState<{ open: boolean; form: ReqFormData }>({ open: false, form: EMPTY_REQ_FORM });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; companyId: string; companyName: string }>({
    open: false, companyId: '', companyName: '',
  });

  // ── Password visibility ───────────────────────────────────────────────────

  const canSeePassword = useMemo(() => {
    if (companyDialog.editId === null) return true;
    if (currentUserRole === 'CEO') return true;
    const company = companies.find(c => c.id === companyDialog.editId);
    return company?.createdById === currentUserId;
  }, [companyDialog.editId, companies, currentUserId, currentUserRole]);

  // ── KPI ──────────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const total = companies.length;
    const registered = companies.filter(c => c.registrationStatus === 'REGISTERED').length;
    const inProgress = companies.filter(c => c.registrationStatus === 'IN_PROGRESS').length;
    const notStarted = companies.filter(c => c.registrationStatus === 'NOT_STARTED').length;
    const closed = companies.filter(c => c.registrationStatus === 'CLOSED_INACTIVE').length;
    const pct = (n: number) => total ? Math.round((n / total) * 100) : 0;
    return { total, registered, inProgress, notStarted, closed, pct };
  }, [companies]);

  // ── Filtered companies for table ──────────────────────────────────────────

  const filteredCompanies = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.contactName?.toLowerCase().includes(q) ?? false) ||
      (c.contactEmail?.toLowerCase().includes(q) ?? false),
    );
  }, [companies, search]);

  const pagedCompanies = useMemo(() => {
    const start = (companyPage - 1) * PAGE_SIZE;
    return filteredCompanies.slice(start, start + PAGE_SIZE);
  }, [filteredCompanies, companyPage]);

  // ── Panel data ────────────────────────────────────────────────────────────

  const archivePanelCompany = useMemo(
    () => companies.find(c => c.id === archivePanelCompanyId) ?? null,
    [companies, archivePanelCompanyId],
  );

  const docPanelDocs = useMemo(
    () => documents.filter(d => d.companyId === docPanelCompanyId).slice(0, 5),
    [documents, docPanelCompanyId],
  );

  const reqPanelReqs = useMemo(
    () => requests.filter(r => r.companyId === reqPanelCompanyId).slice(0, 5),
    [requests, reqPanelCompanyId],
  );

  // ── Tab data ──────────────────────────────────────────────────────────────

  const filteredArchiveEntries = useMemo(() => {
    return archiveEntries.filter(e =>
      !archivesFilter || e.companyId === archivesFilter,
    );
  }, [archiveEntries, archivesFilter]);

  const filteredDocs = useMemo(() => {
    return documents.filter(d =>
      !docsFilter || d.companyId === docsFilter,
    );
  }, [documents, docsFilter]);

  const filteredReqs = useMemo(() => {
    return requests.filter(r =>
      !reqsFilter || r.companyId === reqsFilter,
    );
  }, [requests, reqsFilter]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  async function saveCompany(data: CompanyFormData) {
    const body = {
      name: data.name,
      logoUrl: data.logoUrl || null,
      vendorId: data.vendorId || null,
      portalUsername: data.portalUsername || null,
      portalPassword: data.portalPassword || null,
      contactName: data.contactName || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      registrationStatus: data.registrationStatus,
      registrationDate: data.registrationDate || null,
      registrationExpiry: data.registrationExpiry || null,
      whatNext: data.whatNext || null,
      notes: data.notes || null,
    };

    if (companyDialog.editId) {
      const res = await fetch(`/api/bd/companies/${companyDialog.editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to update');
      }
      const updated = await res.json();
      setCompanies(prev => prev.map(c => c.id === companyDialog.editId ? { ...c, ...updated } : c));
    } else {
      const res = await fetch('/api/bd/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to create');
      }
      const created = await res.json();
      setCompanies(prev => [{ ...created, _count: { documents: 0, requests: 0 }, archiveEntries: [] }, ...prev]);
    }
    router.refresh();
  }

  async function saveDocument(data: DocFormData) {
    const res = await fetch(`/api/bd/companies/${data.companyId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        fileUrl: data.fileUrl || null,
        status: data.status,
        submittedAt: data.submittedAt || undefined,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? 'Failed to create document');
    }
    const created = await res.json();
    const company = companies.find(c => c.id === data.companyId);
    setDocuments(prev => [{ ...created, company: { id: data.companyId, name: company?.name ?? '' } }, ...prev]);
    router.refresh();
  }

  async function saveRequest(data: ReqFormData) {
    const res = await fetch(`/api/bd/companies/${data.companyId}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        requestType: data.requestType || null,
        status: data.status,
        receivedAt: data.receivedAt || undefined,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? 'Failed to create request');
    }
    const created = await res.json();
    const company = companies.find(c => c.id === data.companyId);
    setRequests(prev => [{ ...created, company: { id: data.companyId, name: company?.name ?? '' } }, ...prev]);
    router.refresh();
  }

  async function deleteCompany(id: string) {
    const res = await fetch(`/api/bd/companies/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? 'Failed to delete');
    }
    setCompanies(prev => prev.filter(c => c.id !== id));
    router.refresh();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'companies', label: 'Companies', count: companies.length },
    { key: 'archives', label: 'Archives', count: archiveEntries.length },
    { key: 'documents', label: 'Submitted Documents', count: totalDocs },
    { key: 'requests', label: 'Received Requests', count: totalRequests },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-600 via-sky-500 to-blue-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Handshake className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Business Development</h1>
            </div>
            <p className="text-sky-100 text-sm">Manage companies, registration status, requirements, and all related documents &amp; requests.</p>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{kpi.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">Companies</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Registered</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{kpi.registered}</p>
            <p className="text-xs text-emerald-500 mt-0.5">{kpi.pct(kpi.registered)}% of total</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">In Progress</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{kpi.inProgress}</p>
            <p className="text-xs text-amber-500 mt-0.5">{kpi.pct(kpi.inProgress)}% of total</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm">
            <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Not Started</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{kpi.notStarted}</p>
            <p className="text-xs text-rose-500 mt-0.5">{kpi.pct(kpi.notStarted)}% of total</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-slate-50 to-white border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">Closed</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{kpi.closed}</p>
            <p className="text-xs text-slate-500 mt-0.5">{kpi.pct(kpi.closed)}% of total</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === t.key
                    ? 'border-sky-600 text-sky-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                )}
              >
                {t.label}
                <span className={cn(
                  'inline-flex items-center justify-center rounded-full text-xs px-1.5 min-w-[1.25rem] h-5',
                  activeTab === t.key ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600',
                )}>
                  {t.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* ── Companies Tab ── */}
        {activeTab === 'companies' && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search companies…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCompanyPage(1); }}
                  className="pl-8"
                />
              </div>
              {canManage && (
                <Button onClick={() => setCompanyDialog({ open: true, editId: null, form: EMPTY_COMPANY_FORM })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Company
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[220px]">Company</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Registration Status</TableHead>
                      <TableHead>What&apos;s Next</TableHead>
                      <TableHead>Last Update</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCompanies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-slate-400">
                          {search ? 'No companies match your search' : 'No companies yet. Click "+ Add Company" to get started.'}
                        </TableCell>
                      </TableRow>
                    ) : pagedCompanies.map(company => (
                      <TableRow key={company.id} className="hover:bg-slate-50/70">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <CompanyAvatar company={company} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{company.name}</p>
                              <p className="text-xs text-slate-400">{company._count.documents} docs · {company._count.requests} requests</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {company.contactName || company.contactEmail || company.contactPhone ? (
                            <div className="space-y-0.5 text-xs text-slate-600">
                              {company.contactName && (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3 text-slate-400" />
                                  <span className="font-medium">{company.contactName}</span>
                                </div>
                              )}
                              {company.contactEmail && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  <span className="text-slate-500">{company.contactEmail}</span>
                                </div>
                              )}
                              {company.contactPhone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  <span className="text-slate-500">{company.contactPhone}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>{regStatusBadge(company.registrationStatus)}</TableCell>
                        <TableCell>
                          <p className="text-xs text-slate-600 max-w-[200px] line-clamp-2">
                            {company.whatNext || <span className="italic text-slate-400">—</span>}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">{fmt(company.updatedAt)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="View Archive"
                              onClick={() => { setArchivePanelCompanyId(company.id); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                            <button
                              title="View Documents"
                              onClick={() => { setDocPanelCompanyId(company.id); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  title="Delete"
                                  onClick={() => setDeleteDialog({ open: true, companyId: company.id, companyName: company.name })}
                                  className="p-1.5 rounded hover:bg-rose-50 text-rose-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                                      <MoreVertical className="h-4 w-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setCompanyDialog({
                                        open: true,
                                        editId: company.id,
                                        form: {
                                          name: company.name,
                                          logoUrl: company.logoUrl ?? '',
                                          vendorId: company.vendorId ?? '',
                                          portalUsername: company.portalUsername ?? '',
                                          portalPassword: company.portalPassword ?? '',
                                          contactName: company.contactName ?? '',
                                          contactEmail: company.contactEmail ?? '',
                                          contactPhone: company.contactPhone ?? '',
                                          registrationStatus: company.registrationStatus,
                                          registrationDate: company.registrationDate ? company.registrationDate.slice(0, 10) : '',
                                          registrationExpiry: company.registrationExpiry ? company.registrationExpiry.slice(0, 10) : '',
                                          whatNext: company.whatNext ?? '',
                                          notes: company.notes ?? '',
                                        },
                                      });
                                    }}>
                                      <Edit className="h-4 w-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="px-4 pb-4">
                <Pagination
                  page={companyPage}
                  total={filteredCompanies.length}
                  pageSize={PAGE_SIZE}
                  onChange={setCompanyPage}
                />
              </div>
            </div>

            {/* 3 Summary Panels */}
            {companies.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Archive Panel */}
                <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-1.5 text-sm">
                      <Archive className="h-4 w-4 text-slate-400" /> Company Archive
                    </h3>
                    <select
                      value={archivePanelCompanyId}
                      onChange={e => setArchivePanelCompanyId(e.target.value)}
                      className="text-xs px-2 py-1 rounded border bg-background max-w-[140px] truncate"
                    >
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <ArchivePanel
                    company={archivePanelCompany}
                    canManage={canManage}
                    onRefresh={() => router.refresh()}
                  />
                </div>

                {/* Documents Panel */}
                <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-1.5 text-sm">
                      <FileCheck className="h-4 w-4 text-slate-400" /> Submitted Documents
                    </h3>
                    <select
                      value={docPanelCompanyId}
                      onChange={e => setDocPanelCompanyId(e.target.value)}
                      className="text-xs px-2 py-1 rounded border bg-background max-w-[140px] truncate"
                    >
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {docPanelDocs.length === 0 ? (
                    <EmptyState icon={FileText} message="No documents for this company" />
                  ) : (
                    <div className="space-y-2">
                      {docPanelDocs.map(doc => (
                        <div key={doc.id} className="flex items-start justify-between gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{doc.title}</p>
                            <p className="text-xs text-slate-400">{fmt(doc.submittedAt)}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {docStatusBadge(doc.status)}
                            {doc.fileUrl && (
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-600">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {docPanelDocs.length > 0 && (
                    <button
                      onClick={() => { setDocsFilter(docPanelCompanyId); setActiveTab('documents'); }}
                      className="text-xs text-sky-600 hover:underline flex items-center gap-1"
                    >
                      View All Documents <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Requests Panel */}
                <div className="rounded-xl border bg-white shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-1.5 text-sm">
                      <Inbox className="h-4 w-4 text-slate-400" /> Received Requests
                    </h3>
                    <select
                      value={reqPanelCompanyId}
                      onChange={e => setReqPanelCompanyId(e.target.value)}
                      className="text-xs px-2 py-1 rounded border bg-background max-w-[140px] truncate"
                    >
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {reqPanelReqs.length === 0 ? (
                    <EmptyState icon={AlertCircle} message="No requests for this company" />
                  ) : (
                    <div className="space-y-2">
                      {reqPanelReqs.map(req => (
                        <div key={req.id} className="flex items-start justify-between gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{req.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {req.requestType && (
                                <span className="text-xs text-slate-400">{req.requestType}</span>
                              )}
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-400">{fmt(req.receivedAt)}</span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">{reqStatusBadge(req.status)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {reqPanelReqs.length > 0 && (
                    <button
                      onClick={() => { setReqsFilter(reqPanelCompanyId); setActiveTab('requests'); }}
                      className="text-xs text-sky-600 hover:underline flex items-center gap-1"
                    >
                      View All Requests <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Archives Tab ── */}
        {activeTab === 'archives' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <select
                value={archivesFilter}
                onChange={e => setArchivesFilter(e.target.value)}
                className="h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">All Companies</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Company</TableHead>
                    <TableHead>Entry Type</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchiveEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-slate-400">No archive entries found</TableCell>
                    </TableRow>
                  ) : filteredArchiveEntries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium text-sm">{entry.company?.name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {ARCHIVE_TYPE_LABELS[entry.entryType] ?? entry.entryType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-slate-600 max-w-[400px] line-clamp-2">
                          {entry.content || <span className="italic text-slate-400">Empty</span>}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{fmt(entry.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── Documents Tab ── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={docsFilter}
                onChange={e => setDocsFilter(e.target.value)}
                className="h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">All Companies</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {canManage && (
                <Button onClick={() => setDocDialog({ open: true, form: { ...EMPTY_DOC_FORM, companyId: docsFilter } })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Document
                </Button>
              )}
            </div>
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Company</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">File</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-slate-400">No documents found</TableCell>
                    </TableRow>
                  ) : filteredDocs.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium">{doc.company?.name ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{doc.title}</TableCell>
                      <TableCell className="text-xs text-slate-500">{fmt(doc.submittedAt)}</TableCell>
                      <TableCell>{docStatusBadge(doc.status)}</TableCell>
                      <TableCell className="text-right">
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800">
                            <ExternalLink className="h-4 w-4 inline" />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── Requests Tab ── */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={reqsFilter}
                onChange={e => setReqsFilter(e.target.value)}
                className="h-9 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">All Companies</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {canManage && (
                <Button onClick={() => setReqDialog({ open: true, form: { ...EMPTY_REQ_FORM, companyId: reqsFilter } })}>
                  <Plus className="h-4 w-4 mr-1" /> Add Request
                </Button>
              )}
            </div>
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Company</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReqs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-slate-400">No requests found</TableCell>
                    </TableRow>
                  ) : filteredReqs.map(req => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium">{req.company?.name ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{req.title}</TableCell>
                      <TableCell>
                        {req.requestType ? (
                          <Badge variant="outline" className="text-xs">{req.requestType}</Badge>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{fmt(req.receivedAt)}</TableCell>
                      <TableCell>{reqStatusBadge(req.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

      </div>

      {/* ── Dialogs ── */}

      <CompanyDialog
        open={companyDialog.open}
        onClose={() => setCompanyDialog(d => ({ ...d, open: false }))}
        initial={companyDialog.form}
        canSeePassword={canSeePassword}
        onSave={saveCompany}
      />

      <DocumentDialog
        open={docDialog.open}
        onClose={() => setDocDialog(d => ({ ...d, open: false }))}
        companies={companies}
        initial={docDialog.form}
        onSave={saveDocument}
      />

      <RequestDialog
        open={reqDialog.open}
        onClose={() => setReqDialog(d => ({ ...d, open: false }))}
        companies={companies}
        initial={reqDialog.form}
        onSave={saveRequest}
      />

      <DeleteDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog(d => ({ ...d, open: false }))}
        companyName={deleteDialog.companyName}
        onConfirm={() => deleteCompany(deleteDialog.companyId)}
      />
    </div>
  );
}
