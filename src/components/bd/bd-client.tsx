'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Handshake, Search, Plus, Trash2, Edit, FileText,
  MoreVertical, ChevronLeft, ChevronRight, Loader2, X, Building2,
  Mail, Phone, User, FileCheck, AlertCircle, Archive,
  Inbox, ExternalLink, Eye, EyeOff, Hash, Lock, Upload,
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

type DocAttachment = { name: string; url: string };

type BdDocument = {
  id: string;
  companyId: string;
  title: string;
  fileUrl: string | null;
  attachments: string | null;
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
  registrationChannel: string | null;
  channelOther: string | null;
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

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
function resolveUrl(p: string | null) {
  if (!p) return p;
  return BASE_PATH && !p.startsWith(BASE_PATH) && p.startsWith('/uploads/') ? `${BASE_PATH}${p}` : p;
}

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

function CompanyAvatar({ company, size = 'md' }: { company: BdCompany; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = React.useState(false);
  const sizeClass = size === 'lg' ? 'h-24 w-24 text-xl' : size === 'sm' ? 'h-10 w-10 text-xs' : 'h-16 w-16 text-sm';
  const initials = company.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  if (company.logoUrl && !imgError) {
    return (
      <img
        src={resolveUrl(company.logoUrl)!}
        alt={company.name}
        className={`${sizeClass} rounded-full object-contain border border-slate-200 flex-shrink-0 bg-white p-0.5`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold border border-violet-200 flex-shrink-0`}>
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
            className={cn('w-7 h-7 rounded text-xs font-medium', p === page ? 'bg-violet-600 text-white' : 'hover:bg-slate-100')}
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
  registrationChannel: string;
  channelOther: string;
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
  registrationChannel: '', channelOther: '',
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => { setForm(initial); setError(''); setLogoUploadError(''); }, [open, initial]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true); setLogoUploadError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'bd-logos');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setForm(f => ({ ...f, logoUrl: data.filePath }));
    } catch (err) {
      setLogoUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

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
            <div className="col-span-2 space-y-2">
              <Label>Company Logo</Label>
              {form.logoUrl && (
                <div className="flex items-center gap-2">
                  <img src={resolveUrl(form.logoUrl)!} alt="Logo" className="h-12 w-12 rounded-lg object-contain border bg-slate-50 p-0.5" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  <span className="text-xs text-slate-500 truncate flex-1">{form.logoUrl.split('/').pop()}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))} className="text-slate-400 hover:text-rose-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}>
                  {logoUploading ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Uploading…</> : <><Upload className="h-3.5 w-3.5 mr-1" />{form.logoUrl ? 'Replace Logo' : 'Upload Logo'}</>}
                </Button>
                {logoUploadError && <span className="text-xs text-rose-600">{logoUploadError}</span>}
              </div>
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

            <div className="col-span-2 space-y-1">
              <Label htmlFor="c-channel">Registration Channel</Label>
              <select id="c-channel" {...field('registrationChannel')} className="w-full h-9 px-2 rounded-md border bg-background text-sm">
                <option value="">— Select channel —</option>
                <option value="SAP">SAP</option>
                <option value="Oracle">Oracle</option>
                <option value="Company Website">Company Website</option>
                <option value="Email">Email</option>
                <option value="Others">Others (specify)</option>
              </select>
            </div>
            {form.registrationChannel === 'Others' && (
              <div className="col-span-2 space-y-1">
                <Label htmlFor="c-channel-other">Specify Channel</Label>
                <Input id="c-channel-other" {...field('channelOther')} placeholder="e.g. Phone, In-person…" />
              </div>
            )}

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

type DocFormData = { companyId: string; title: string; fileUrl: string; attachments: DocAttachment[]; status: string; submittedAt: string };
const EMPTY_DOC_FORM: DocFormData = { companyId: '', title: '', fileUrl: '', attachments: [], status: 'SUBMITTED', submittedAt: '' };

function DocumentDialog({
  open, onClose, companies, initial, onSave, isEdit,
}: {
  open: boolean; onClose: () => void; companies: BdCompany[];
  initial: DocFormData; onSave: (d: DocFormData) => Promise<void>; isEdit: boolean;
}) {
  const [form, setForm] = useState<DocFormData>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState('');
  const [pendingName, setPendingName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => { setForm(initial); setError(''); setFileUploadError(''); setPendingName(''); }, [open, initial]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true); setFileUploadError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'bd-documents');
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      const name = pendingName.trim() || file.name.replace(/\.[^.]+$/, '');
      setForm(f => ({ ...f, attachments: [...f.attachments, { name, url: data.filePath }] }));
      setPendingName('');
    } catch (err) {
      setFileUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setFileUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeAttachment(idx: number) {
    setForm(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== idx) }));
  }

  function renameAttachment(idx: number, name: string) {
    setForm(f => ({ ...f, attachments: f.attachments.map((a, i) => i === idx ? { ...a, name } : a) }));
  }

  const field = (key: keyof DocFormData) => ({
    value: form[key] as string,
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Document' : 'Add Document'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Company *</Label>
            <select {...field('companyId')} disabled={isEdit} className="w-full h-9 px-2 rounded-md border bg-background text-sm disabled:opacity-60">
              <option value="">Select company…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Document Title *</Label>
            <Input {...field('title')} placeholder="e.g. VAT Certificate" />
          </div>

          {/* ── Multi-attachment section ── */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            {form.attachments.length > 0 && (
              <div className="space-y-1.5">
                {form.attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border bg-slate-50">
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <Input
                      value={att.name}
                      onChange={e => renameAttachment(idx, e.target.value)}
                      className="h-7 text-xs flex-1 min-w-0"
                      placeholder="File name"
                    />
                    <a href={resolveUrl(att.url)!} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-700 flex-shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button type="button" onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-rose-500 flex-shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={pendingName}
                onChange={e => setPendingName(e.target.value)}
                placeholder="Optional file label…"
                className="h-8 text-xs flex-1 min-w-[140px]"
              />
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip" className="hidden" onChange={handleFileUpload} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={fileUploading}>
                {fileUploading ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Uploading…</> : <><Upload className="h-3.5 w-3.5 mr-1" />Add File</>}
              </Button>
            </div>
            {fileUploadError && <p className="text-xs text-rose-600">{fileUploadError}</p>}
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
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Add Document'}
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
  open, onClose, companies, initial, onSave, isEdit,
}: {
  open: boolean; onClose: () => void; companies: BdCompany[];
  initial: ReqFormData; onSave: (d: ReqFormData) => Promise<void>; isEdit: boolean;
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
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Request' : 'Add Request'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Company *</Label>
            <select {...field('companyId')} disabled={isEdit} className="w-full h-9 px-2 rounded-md border bg-background text-sm disabled:opacity-60">
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
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : isEdit ? 'Save Changes' : 'Add Request'}
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
  company, canManage, onSave, onDelete,
}: {
  company: BdCompany | null;
  canManage: boolean;
  onSave: (companyId: string, entryType: string, content: string) => Promise<void>;
  onDelete: (companyId: string, entryType: string) => void;
}) {
  const [editType, setEditType] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  if (!company) {
    return <EmptyState icon={Archive} message="Select a company to view its archive" />;
  }

  const entries = ARCHIVE_TYPES.map(t => {
    const found = company.archiveEntries.find(e => e.entryType === t);
    return { type: t, content: found?.content ?? '', updatedAt: found?.updatedAt ?? null, exists: !!found };
  });

  async function handleSave(type: string, content: string) {
    setSaving(true);
    try {
      await onSave(company!.id, type, content);
      setEditType(null);
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
                    <Button size="sm" onClick={() => handleSave(entry.type, editContent)} disabled={saving}>
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
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm" variant="ghost"
                  onClick={() => { setEditType(entry.type); setEditContent(entry.content); }}
                  className="h-7 w-7 p-0"
                  title="Edit"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                {entry.exists && (
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => onDelete(company.id, entry.type)}
                    className="h-7 w-7 p-0 text-rose-400 hover:text-rose-600"
                    title="Clear"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Company Detail Modal ─────────────────────────────────────────────────────

function CompanyDetailModal({
  company,
  open,
  onClose,
  canManage,
  onEdit,
}: {
  company: BdCompany | null;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
  onEdit: () => void;
}) {
  const [showPwd, setShowPwd] = React.useState(false);
  if (!company) return null;

  const row = (label: string, value: React.ReactNode) => value ? (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span className="text-xs text-slate-800">{value}</span>
    </div>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <CompanyAvatar company={company} size="sm" />
            <div>
              <DialogTitle className="text-lg">{company.name}</DialogTitle>
              <div className="mt-0.5">{regStatusBadge(company.registrationStatus)}</div>
            </div>
          </div>
        </DialogHeader>

        {/* Logo */}
        {company.logoUrl && (
          <div className="flex justify-center py-3 bg-slate-50 rounded-xl border">
            <img
              src={resolveUrl(company.logoUrl)!}
              alt={company.name}
              className="max-h-28 max-w-xs object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        <div className="space-y-4">
          {/* Vendor Portal */}
          {(company.vendorId || company.portalUsername) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Vendor Portal</p>
              <div className="rounded-lg border p-3 space-y-0">
                {row('Vendor ID', company.vendorId)}
                {row('Username', company.portalUsername)}
                {company.portalPassword && row('Password',
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono">{showPwd ? company.portalPassword : '••••••••'}</span>
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="text-slate-400 hover:text-slate-600">
                      {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Contact */}
          {(company.contactName || company.contactEmail || company.contactPhone) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contact</p>
              <div className="rounded-lg border p-3 space-y-0">
                {row('Name', company.contactName)}
                {row('Email', company.contactEmail)}
                {row('Phone', company.contactPhone)}
              </div>
            </div>
          )}

          {/* Registration */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Registration</p>
            <div className="rounded-lg border p-3 space-y-0">
              {row('Channel', company.registrationChannel === 'Others' ? (company.channelOther || 'Others') : company.registrationChannel)}
              {row('Date', company.registrationDate ? fmt(company.registrationDate) : null)}
              {row('Expiry', company.registrationExpiry ? fmt(company.registrationExpiry) : null)}
            </div>
          </div>

          {/* Notes */}
          {(company.whatNext || company.notes) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes</p>
              <div className="rounded-lg border p-3 space-y-2">
                {company.whatNext && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">What&apos;s Next</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{company.whatNext}</p>
                  </div>
                )}
                {company.notes && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Notes</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{company.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Archive summary */}
          {company.archiveEntries.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Archive</p>
              <div className="rounded-lg border divide-y">
                {company.archiveEntries.filter(e => e.content).map(e => (
                  <div key={e.entryType} className="p-3">
                    <p className="text-xs font-medium text-slate-600 mb-0.5">{ARCHIVE_TYPE_LABELS[e.entryType] ?? e.entryType}</p>
                    <p className="text-xs text-slate-500 line-clamp-3 whitespace-pre-wrap">{e.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canManage && (
            <Button onClick={() => { onClose(); onEdit(); }}>
              <Edit className="h-4 w-4 mr-1.5" /> Edit Company
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[]>(initialArchiveEntries);

  const [activeTab, setActiveTab] = useState<'companies' | 'archives' | 'documents' | 'requests'>('companies');
  const [search, setSearch] = useState('');
  const [companyPage, setCompanyPage] = useState(1);

  // Panel company pickers
  const [archivePanelCompanyId, setArchivePanelCompanyId] = useState<string>(initialCompanies[0]?.id ?? '');
  const [docPanelCompanyId, setDocPanelCompanyId] = useState<string>(initialCompanies[0]?.id ?? '');
  const [reqPanelCompanyId, setReqPanelCompanyId] = useState<string>(initialCompanies[0]?.id ?? '');

  // Tab filters
  const [companyStatusFilter, setCompanyStatusFilter] = useState('');
  const [archivesFilter, setArchivesFilter] = useState('');
  const [docsFilter, setDocsFilter] = useState('');
  const [reqsFilter, setReqsFilter] = useState('');

  // View detail modal
  const [viewCompanyId, setViewCompanyId] = useState<string | null>(null);
  const viewCompany = useMemo(() => companies.find(c => c.id === viewCompanyId) ?? null, [companies, viewCompanyId]);

  // Archive delete dialog
  const [archiveDeleteDialog, setArchiveDeleteDialog] = useState<{ open: boolean; companyId: string; entryType: string; label: string }>({
    open: false, companyId: '', entryType: '', label: '',
  });

  // Dialogs
  const [companyDialog, setCompanyDialog] = useState<{ open: boolean; editId: string | null; form: CompanyFormData }>({
    open: false, editId: null, form: EMPTY_COMPANY_FORM,
  });
  const [docDialog, setDocDialog] = useState<{ open: boolean; editId: string | null; form: DocFormData }>({ open: false, editId: null, form: EMPTY_DOC_FORM });
  const [reqDialog, setReqDialog] = useState<{ open: boolean; editId: string | null; form: ReqFormData }>({ open: false, editId: null, form: EMPTY_REQ_FORM });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; companyId: string; companyName: string }>({
    open: false, companyId: '', companyName: '',
  });
  const [itemDeleteDialog, setItemDeleteDialog] = useState<{ open: boolean; type: 'doc' | 'req'; id: string; label: string }>({
    open: false, type: 'doc', id: '', label: '',
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
      (!companyStatusFilter || c.registrationStatus === companyStatusFilter) &&
      (c.name.toLowerCase().includes(q) ||
       (c.contactName?.toLowerCase().includes(q) ?? false) ||
       (c.contactEmail?.toLowerCase().includes(q) ?? false)),
    );
  }, [companies, search, companyStatusFilter]);

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
      registrationChannel: data.registrationChannel || null,
      channelOther: data.channelOther || null,
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
    const attachmentsPayload = data.attachments.length > 0 ? data.attachments : null;
    if (docDialog.editId) {
      const res = await fetch(`/api/bd/companies/${data.companyId}/documents/${docDialog.editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, attachments: attachmentsPayload, status: data.status }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to update document'); }
      setDocuments(prev => prev.map(d => d.id === docDialog.editId ? {
        ...d, title: data.title, attachments: attachmentsPayload ? JSON.stringify(attachmentsPayload) : null, status: data.status,
      } : d));
    } else {
      const res = await fetch(`/api/bd/companies/${data.companyId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, attachments: attachmentsPayload, status: data.status, submittedAt: data.submittedAt || undefined }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to create document'); }
      const created = await res.json();
      const company = companies.find(c => c.id === data.companyId);
      setDocuments(prev => [{ ...created, company: { id: data.companyId, name: company?.name ?? '' } }, ...prev]);
    }
    router.refresh();
  }

  async function saveRequest(data: ReqFormData) {
    if (reqDialog.editId) {
      const res = await fetch(`/api/bd/companies/${data.companyId}/requests/${reqDialog.editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, requestType: data.requestType || null, status: data.status }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to update request'); }
      setRequests(prev => prev.map(r => r.id === reqDialog.editId ? { ...r, title: data.title, requestType: data.requestType || null, status: data.status } : r));
    } else {
      const res = await fetch(`/api/bd/companies/${data.companyId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: data.title, requestType: data.requestType || null, status: data.status, receivedAt: data.receivedAt || undefined }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to create request'); }
      const created = await res.json();
      const company = companies.find(c => c.id === data.companyId);
      setRequests(prev => [{ ...created, company: { id: data.companyId, name: company?.name ?? '' } }, ...prev]);
    }
    router.refresh();
  }

  async function deleteItem() {
    const { type, id, label } = itemDeleteDialog;
    if (type === 'doc') {
      const doc = documents.find(d => d.id === id);
      const res = await fetch(`/api/bd/companies/${doc?.companyId}/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to delete'); }
      setDocuments(prev => prev.filter(d => d.id !== id));
    } else {
      const req = requests.find(r => r.id === id);
      const res = await fetch(`/api/bd/companies/${req?.companyId}/requests/${id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to delete'); }
      setRequests(prev => prev.filter(r => r.id !== id));
    }
    router.refresh();
    void label;
  }

  async function saveArchiveEntry(companyId: string, entryType: string, content: string) {
    const res = await fetch(`/api/bd/companies/${companyId}/archive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryType, content }),
    });
    if (!res.ok) throw new Error('Failed to save');
    const updated = await res.json() as ArchiveEntry;
    setArchiveEntries(prev => {
      const idx = prev.findIndex(e => e.companyId === companyId && e.entryType === entryType);
      return idx >= 0 ? prev.map((e, i) => i === idx ? updated : e) : [...prev, updated];
    });
    setCompanies(prev => prev.map(c => {
      if (c.id !== companyId) return c;
      const idx = c.archiveEntries.findIndex(e => e.entryType === entryType);
      const newEntries = idx >= 0
        ? c.archiveEntries.map((e, i) => i === idx ? updated : e)
        : [...c.archiveEntries, updated];
      return { ...c, archiveEntries: newEntries };
    }));
  }

  async function deleteArchiveEntry(companyId: string, entryType: string) {
    const res = await fetch(`/api/bd/companies/${companyId}/archive`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryType }),
    });
    if (!res.ok) throw new Error('Failed to delete');
    setArchiveEntries(prev => prev.filter(e => !(e.companyId === companyId && e.entryType === entryType)));
    setCompanies(prev => prev.map(c => c.id !== companyId ? c : {
      ...c,
      archiveEntries: c.archiveEntries.filter(e => e.entryType !== entryType),
    }));
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero */}
        <div className="rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 35%, #7c3aed 65%, #9333ea 100%)' }}>
          {/* Decorative rings */}
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full border border-white/10" />
          <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full border border-white/10" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20 shadow-inner">
                  <Handshake className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Business Development</h1>
              </div>
              <p className="text-violet-200 text-sm pl-1">Vendor registration, portal credentials, documents &amp; requests — all in one place.</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => { setActiveTab('companies'); setCompanyStatusFilter(''); }} className="text-center px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 backdrop-blur-sm transition-colors cursor-pointer">
                <p className="text-2xl font-bold leading-none">{kpi.total}</p>
                <p className="text-xs text-violet-200 mt-0.5">All Vendors</p>
              </button>
              <button onClick={() => { setActiveTab('companies'); setCompanyStatusFilter('REGISTERED'); }} className="text-center px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 backdrop-blur-sm transition-colors cursor-pointer">
                <p className="text-2xl font-bold leading-none">{kpi.registered}</p>
                <p className="text-xs text-violet-200 mt-0.5">Registered</p>
              </button>
              <button onClick={() => { setActiveTab('companies'); setCompanyStatusFilter('IN_PROGRESS'); }} className="text-center px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 backdrop-blur-sm transition-colors cursor-pointer">
                <p className="text-2xl font-bold leading-none">{kpi.inProgress}</p>
                <p className="text-xs text-violet-200 mt-0.5">In Progress</p>
              </button>
            </div>
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
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
                )}
              >
                {t.label}
                <span className={cn(
                  'inline-flex items-center justify-center rounded-full text-xs px-1.5 min-w-[1.25rem] h-5',
                  activeTab === t.key ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600',
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
              <select
                value={companyStatusFilter}
                onChange={e => { setCompanyStatusFilter(e.target.value); setCompanyPage(1); }}
                className="h-9 px-2 rounded-md border bg-background text-sm"
              >
                <option value="">All Statuses</option>
                <option value="REGISTERED">Registered</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="NOT_STARTED">Not Started</option>
                <option value="CLOSED_INACTIVE">Closed / Inactive</option>
              </select>
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
                              title="View Details"
                              onClick={() => setViewCompanyId(company.id)}
                              className="p-1.5 rounded hover:bg-violet-50 text-violet-500"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
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
                                          registrationChannel: company.registrationChannel ?? '',
                                          channelOther: company.channelOther ?? '',
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
                    onSave={saveArchiveEntry}
                    onDelete={(companyId, entryType) => setArchiveDeleteDialog({ open: true, companyId, entryType, label: ARCHIVE_TYPE_LABELS[entryType] ?? entryType })}
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
                            {(() => {
                              const atts: DocAttachment[] = (() => { try { return doc.attachments ? JSON.parse(doc.attachments) : []; } catch { return []; } })();
                              if (atts.length > 0) return (
                                <a href={resolveUrl(atts[0].url)!} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-600" title={`${atts.length} file(s)`}>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              );
                              if (doc.fileUrl) return (
                                <a href={resolveUrl(doc.fileUrl)!} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-600">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              );
                              return null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {docPanelDocs.length > 0 && (
                    <button
                      onClick={() => { setDocsFilter(docPanelCompanyId); setActiveTab('documents'); }}
                      className="text-xs text-violet-600 hover:underline flex items-center gap-1"
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
                      className="text-xs text-violet-600 hover:underline flex items-center gap-1"
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
                    {canManage && <TableHead className="w-[80px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchiveEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 5 : 4} className="py-10 text-center text-slate-400">No archive entries found</TableCell>
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
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Edit"
                              onClick={() => {
                                setArchivePanelCompanyId(entry.companyId);
                                setActiveTab('companies');
                                setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
                              }}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => setArchiveDeleteDialog({ open: true, companyId: entry.companyId, entryType: entry.entryType, label: ARCHIVE_TYPE_LABELS[entry.entryType] ?? entry.entryType })}
                              className="p-1.5 rounded hover:bg-rose-50 text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      )}
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
                <Button onClick={() => setDocDialog({ open: true, editId: null, form: { ...EMPTY_DOC_FORM, companyId: docsFilter } })}>
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
                    {canManage && <TableHead className="w-[80px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-slate-400">No documents found</TableCell>
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
                        {(() => {
                          const atts: DocAttachment[] = (() => { try { return doc.attachments ? JSON.parse(doc.attachments) : []; } catch { return []; } })();
                          if (atts.length > 0) return (
                            <div className="flex flex-col items-end gap-0.5">
                              {atts.map((a, i) => (
                                <a key={i} href={resolveUrl(a.url)!} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />{a.name}
                                </a>
                              ))}
                            </div>
                          );
                          if (doc.fileUrl) return (
                            <a href={resolveUrl(doc.fileUrl)!} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800">
                              <ExternalLink className="h-4 w-4 inline" />
                            </a>
                          );
                          return <span className="text-slate-300 text-xs">—</span>;
                        })()}
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button title="Edit" onClick={() => {
                              const atts: DocAttachment[] = (() => { try { return doc.attachments ? JSON.parse(doc.attachments) : []; } catch { return []; } })();
                              setDocDialog({ open: true, editId: doc.id, form: { companyId: doc.companyId, title: doc.title, fileUrl: doc.fileUrl ?? '', attachments: atts, status: doc.status, submittedAt: doc.submittedAt ? doc.submittedAt.slice(0,10) : '' } });
                            }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Edit className="h-3.5 w-3.5" /></button>
                            <button title="Delete" onClick={() => setItemDeleteDialog({ open: true, type: 'doc', id: doc.id, label: doc.title })} className="p-1.5 rounded hover:bg-rose-50 text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </TableCell>
                      )}
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
                <Button onClick={() => setReqDialog({ open: true, editId: null, form: { ...EMPTY_REQ_FORM, companyId: reqsFilter } })}>
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
                    {canManage && <TableHead className="w-[80px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReqs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-slate-400">No requests found</TableCell>
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
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <button title="Edit" onClick={() => setReqDialog({ open: true, editId: req.id, form: { companyId: req.companyId, title: req.title, requestType: req.requestType ?? 'RFQ', status: req.status, receivedAt: req.receivedAt ? req.receivedAt.slice(0,10) : '' } })} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Edit className="h-3.5 w-3.5" /></button>
                            <button title="Delete" onClick={() => setItemDeleteDialog({ open: true, type: 'req', id: req.id, label: req.title })} className="p-1.5 rounded hover:bg-rose-50 text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </TableCell>
                      )}
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
        isEdit={docDialog.editId !== null}
        onSave={saveDocument}
      />

      <RequestDialog
        open={reqDialog.open}
        onClose={() => setReqDialog(d => ({ ...d, open: false }))}
        companies={companies}
        initial={reqDialog.form}
        isEdit={reqDialog.editId !== null}
        onSave={saveRequest}
      />

      <DeleteDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog(d => ({ ...d, open: false }))}
        companyName={deleteDialog.companyName}
        onConfirm={() => deleteCompany(deleteDialog.companyId)}
      />

      {/* Item delete (doc / req) */}
      <Dialog open={itemDeleteDialog.open} onOpenChange={v => !v && setItemDeleteDialog(d => ({ ...d, open: false }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="h-5 w-5" /> Delete {itemDeleteDialog.type === 'doc' ? 'Document' : 'Request'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Are you sure you want to delete <strong>{itemDeleteDialog.label}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDeleteDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              await deleteItem();
              setItemDeleteDialog(d => ({ ...d, open: false }));
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive entry delete */}
      <Dialog open={archiveDeleteDialog.open} onOpenChange={v => !v && setArchiveDeleteDialog(d => ({ ...d, open: false }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="h-5 w-5" /> Clear Archive Entry
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Clear <strong>{archiveDeleteDialog.label}</strong> for this company? The content will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDeleteDialog(d => ({ ...d, open: false }))}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              await deleteArchiveEntry(archiveDeleteDialog.companyId, archiveDeleteDialog.entryType);
              setArchiveDeleteDialog(d => ({ ...d, open: false }));
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company detail view modal */}
      <CompanyDetailModal
        company={viewCompany}
        open={viewCompanyId !== null}
        onClose={() => setViewCompanyId(null)}
        canManage={canManage}
        onEdit={() => {
          if (!viewCompany) return;
          setCompanyDialog({
            open: true,
            editId: viewCompany.id,
            form: {
              name: viewCompany.name,
              logoUrl: viewCompany.logoUrl ?? '',
              vendorId: viewCompany.vendorId ?? '',
              portalUsername: viewCompany.portalUsername ?? '',
              portalPassword: viewCompany.portalPassword ?? '',
              registrationChannel: viewCompany.registrationChannel ?? '',
              channelOther: viewCompany.channelOther ?? '',
              contactName: viewCompany.contactName ?? '',
              contactEmail: viewCompany.contactEmail ?? '',
              contactPhone: viewCompany.contactPhone ?? '',
              registrationStatus: viewCompany.registrationStatus,
              registrationDate: viewCompany.registrationDate ? viewCompany.registrationDate.slice(0, 10) : '',
              registrationExpiry: viewCompany.registrationExpiry ? viewCompany.registrationExpiry.slice(0, 10) : '',
              whatNext: viewCompany.whatNext ?? '',
              notes: viewCompany.notes ?? '',
            },
          });
        }}
      />
    </div>
  );
}
