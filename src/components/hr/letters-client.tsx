'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail, Plus, Search, Loader2, FileText, Eye, Pencil, Trash2,
  ExternalLink, User, Calendar, Hash, Upload, X, Building2,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const LETTER_TYPES: { value: string; label: string }[] = [
  { value: 'QUESTIONING',           label: 'Questioning (مسائلة)' },
  { value: 'ATTENTION',             label: 'Attention (لفت نظر)' },
  { value: 'FIRST_WARNING',         label: 'First Warning (إنذار أول)' },
  { value: 'FINAL_WARNING',         label: 'Final Warning (إنذار نهائي)' },
  { value: 'NON_RENEWAL_NOTICE',    label: 'Non-Renewal Notice (عدم تجديد)' },
  { value: 'DISMISSAL',             label: 'Dismissal (فصل)' },
  { value: 'CIRCULATION',           label: 'Circular (تعميم)' },
  { value: 'WORK_COMMENCEMENT',     label: 'Work Commencement (مباشرة عمل)' },
  { value: 'SALARY_CERTIFICATE',    label: 'Salary Certificate (تعريف راتب)' },
  { value: 'LEAVE_NOTICE',          label: 'Leave Notice (إجازة)' },
  { value: 'RETURN_FROM_LEAVE',     label: 'Return from Leave (عودة من إجازة)' },
  { value: 'PROBATION_EVALUATION',  label: 'Probation Evaluation (تقييم التجربة)' },
  { value: 'PERFORMANCE_APPRAISAL', label: 'Performance Appraisal (تقييم الأداء)' },
  { value: 'CLEARANCE_FORM',        label: 'Clearance Form (إخلاء طرف)' },
  { value: 'SALARY_NON_DISCLOSURE', label: 'Salary Non-Disclosure (إقرار عدم إفصاح)' },
  { value: 'OTHER',                 label: 'Other (أخرى)' },
];

const TYPE_BADGE: Record<string, string> = {
  QUESTIONING:           'bg-amber-100 text-amber-800 border-amber-200',
  ATTENTION:             'bg-yellow-100 text-yellow-800 border-yellow-200',
  FIRST_WARNING:         'bg-orange-100 text-orange-800 border-orange-200',
  FINAL_WARNING:         'bg-rose-100 text-rose-800 border-rose-200',
  DISMISSAL:             'bg-red-100 text-red-800 border-red-200',
  NON_RENEWAL_NOTICE:    'bg-red-100 text-red-800 border-red-200',
  CIRCULATION:           'bg-sky-100 text-sky-800 border-sky-200',
  WORK_COMMENCEMENT:     'bg-emerald-100 text-emerald-800 border-emerald-200',
  SALARY_CERTIFICATE:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  LEAVE_NOTICE:          'bg-violet-100 text-violet-800 border-violet-200',
  RETURN_FROM_LEAVE:     'bg-violet-100 text-violet-800 border-violet-200',
  PROBATION_EVALUATION:  'bg-slate-100 text-slate-700 border-slate-200',
  PERFORMANCE_APPRAISAL: 'bg-slate-100 text-slate-700 border-slate-200',
  CLEARANCE_FORM:        'bg-slate-100 text-slate-700 border-slate-200',
  SALARY_NON_DISCLOSURE: 'bg-slate-100 text-slate-700 border-slate-200',
  OTHER:                 'bg-slate-100 text-slate-700 border-slate-200',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Employee = { id: string; fullNameEn: string; employmentId: string };

type Letter = {
  id: string;
  letterNumber: string;
  letterType: string;
  classification: 'INTERNAL' | 'EXTERNAL';
  employeeId: string;
  subject: string;
  content: string | null;
  attachmentUrl: string | null;
  issuedAt: string;
  notes: string | null;
  employee: { id: string; fullNameEn: string; employmentId: string };
  createdBy: { id: string; name: string };
};

type Props = {
  employees: Employee[];
  canManage: boolean;
};

const EMPTY_FORM = {
  employeeId: '',
  empSearch: '',
  letterType: '',
  classification: 'INTERNAL' as 'INTERNAL' | 'EXTERNAL',
  subject: '',
  contentMode: 'write' as 'write' | 'attach',
  content: '',
  attachmentUrl: '',
  issuedAt: new Date().toISOString().slice(0, 10),
  notes: '',
};

function typeBadge(type: string) {
  const cls = TYPE_BADGE[type] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  const label = LETTER_TYPES.find((t) => t.value === type)?.label.split(' ')[0] ?? type;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LettersClient({ employees, canManage }: Props) {
  const router = useRouter();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('__all__');
  const [filterClass, setFilterClass] = useState('__all__');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLetter, setEditLetter] = useState<Letter | null>(null);
  const [viewLetter, setViewLetter] = useState<Letter | null>(null);
  const [deleteLetter, setDeleteLetter] = useState<Letter | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [empOpen, setEmpOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredEmployees = employees.filter((e) => {
    const q = form.empSearch.toLowerCase();
    return !q || e.fullNameEn.toLowerCase().includes(q) || e.employmentId.toLowerCase().includes(q);
  });

  async function fetchLetters() {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/letters');
      if (res.ok) setLetters(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLetters(); }, []);

  function openCreate() {
    setEditLetter(null);
    setForm({ ...EMPTY_FORM, issuedAt: new Date().toISOString().slice(0, 10) });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(l: Letter) {
    setEditLetter(l);
    const emp = employees.find((e) => e.id === l.employeeId);
    setForm({
      employeeId: l.employeeId,
      empSearch: emp?.fullNameEn ?? '',
      letterType: l.letterType,
      classification: l.classification,
      subject: l.subject,
      contentMode: l.attachmentUrl ? 'attach' : 'write',
      content: l.content ?? '',
      attachmentUrl: l.attachmentUrl ?? '',
      issuedAt: l.issuedAt.slice(0, 10),
      notes: l.notes ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setForm((f) => ({ ...f, attachmentUrl: data.filePath }));
    } catch {
      setFormError('File upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.employeeId) return setFormError('Select an employee');
    if (!form.letterType) return setFormError('Select a letter type');
    if (!form.subject.trim()) return setFormError('Subject is required');
    if (form.contentMode === 'attach' && !form.attachmentUrl) return setFormError('Upload a PDF');
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        employeeId: form.employeeId,
        letterType: form.letterType,
        classification: form.classification,
        subject: form.subject.trim(),
        content: form.contentMode === 'write' && form.content.trim() ? form.content.trim() : undefined,
        attachmentUrl: form.contentMode === 'attach' && form.attachmentUrl ? form.attachmentUrl : undefined,
        issuedAt: form.issuedAt,
        notes: form.notes.trim() || undefined,
      };
      const url = editLetter ? `/api/hr/letters/${editLetter.id}` : '/api/hr/letters';
      const method = editLetter ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Save failed');
      }
      setDialogOpen(false);
      fetchLetters();
      router.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteLetter) return;
    setDeleting(true);
    try {
      await fetch(`/api/hr/letters/${deleteLetter.id}`, { method: 'DELETE' });
      setDeleteLetter(null);
      fetchLetters();
    } finally {
      setDeleting(false);
    }
  }

  const filtered = letters.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      l.letterNumber.toLowerCase().includes(q) ||
      l.subject.toLowerCase().includes(q) ||
      l.employee.fullNameEn.toLowerCase().includes(q) ||
      l.employee.employmentId.toLowerCase().includes(q);
    const matchType = filterType === '__all__' || l.letterType === filterType;
    const matchClass = filterClass === '__all__' || l.classification === filterClass;
    return matchSearch && matchType && matchClass;
  });

  const totalCount = letters.length;
  const internalCount = letters.filter((l) => l.classification === 'INTERNAL').length;
  const externalCount = letters.filter((l) => l.classification === 'EXTERNAL').length;
  const thisMonth = (() => {
    const now = new Date();
    return letters.filter((l) => {
      const d = new Date(l.issuedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Mail className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Letters & Correspondence</h1>
              </div>
              <p className="text-blue-100 text-sm">
                Issue and track official HR letters — warnings, circulars, certificates, and more.
              </p>
            </div>
            {canManage && (
              <Button onClick={openCreate} className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                Issue Letter
              </Button>
            )}
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Issued', value: totalCount, sub: 'all time', color: 'blue' },
            { label: 'Internal', value: internalCount, sub: 'INT letters', color: 'violet' },
            { label: 'External', value: externalCount, sub: 'EXT letters', color: 'sky' },
            { label: 'This Month', value: thisMonth, sub: 'current month', color: 'emerald' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className={`rounded-xl border bg-gradient-to-b from-${color}-50 to-white border-${color}-200 p-4 shadow-sm`}>
              <p className={`text-xs text-${color}-600 font-medium uppercase tracking-wide`}>{label}</p>
              <p className={`text-2xl font-bold text-${color}-700 mt-1`}>{value}</p>
              <p className={`text-xs text-${color}-500 mt-0.5`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by number, employee, subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {LETTER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="INTERNAL">Internal</SelectItem>
              <SelectItem value="EXTERNAL">External</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Letters table */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Mail className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No letters found</p>
              <p className="text-sm mt-1">
                {canManage ? 'Click "Issue Letter" to create the first one.' : 'Letters will appear here once issued.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Number</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Class</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Content</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {l.letterNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">{typeBadge(l.letterType)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${l.classification === 'INTERNAL' ? 'bg-slate-100 text-slate-700' : 'bg-sky-100 text-sky-700'}`}>
                          {l.classification === 'INTERNAL' ? <Building2 className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                          {l.classification === 'INTERNAL' ? 'Internal' : 'External'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{l.employee.fullNameEn}</p>
                        <p className="text-xs text-slate-400">{l.employee.employmentId}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="truncate text-slate-700">{l.subject}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {new Date(l.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {l.attachmentUrl ? (
                          <a href={l.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                            <FileText className="h-3.5 w-3.5" /> PDF
                          </a>
                        ) : l.content ? (
                          <span className="text-xs text-slate-400">Written</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(l.content || l.attachmentUrl) && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700" onClick={() => setViewLetter(l)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canManage && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700" onClick={() => openEdit(l)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => setDeleteLetter(l)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              {editLetter ? 'Edit Letter' : 'Issue New Letter'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Classification toggle */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Classification</Label>
              <div className="flex rounded-lg border overflow-hidden w-fit">
                {(['INTERNAL', 'EXTERNAL'] as const).map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    className={`px-5 py-2 text-sm font-medium transition-colors ${form.classification === cls ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    onClick={() => setForm((f) => ({ ...f, classification: cls }))}
                  >
                    {cls === 'INTERNAL' ? (
                      <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Internal</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><ExternalLink className="h-4 w-4" /> External</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Employee picker */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block">
                <User className="h-3.5 w-3.5 inline mr-1" /> Employee <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={form.empSearch}
                  placeholder="Search employee name or ID…"
                  onChange={(e) => {
                    setForm((f) => ({ ...f, empSearch: e.target.value, employeeId: '' }));
                    setEmpOpen(true);
                  }}
                  onFocus={() => setEmpOpen(true)}
                  onBlur={() => setTimeout(() => setEmpOpen(false), 150)}
                />
                {empOpen && filteredEmployees.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-lg border bg-white shadow-lg">
                    {filteredEmployees.slice(0, 20).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors"
                        onMouseDown={() => {
                          setForm((f) => ({ ...f, employeeId: e.id, empSearch: e.fullNameEn }));
                          setEmpOpen(false);
                        }}
                      >
                        <p className="text-sm font-medium">{e.fullNameEn}</p>
                        <p className="text-xs text-slate-400">{e.employmentId}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Letter type + date row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  <Hash className="h-3.5 w-3.5 inline mr-1" /> Letter Type <span className="text-rose-500">*</span>
                </Label>
                <Select value={form.letterType || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, letterType: v === '__none__' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select type…</SelectItem>
                    {LETTER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" /> Issue Date
                </Label>
                <Input
                  type="date"
                  value={form.issuedAt}
                  onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))}
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Subject <span className="text-rose-500">*</span></Label>
              <Input
                value={form.subject}
                placeholder="Brief subject of this letter…"
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>

            {/* Content mode toggle */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Letter Content</Label>
              <div className="flex rounded-lg border overflow-hidden w-fit mb-3">
                {([['write', 'Write on system'], ['attach', 'Attach PDF']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`px-4 py-1.5 text-sm transition-colors ${form.contentMode === mode ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    onClick={() => setForm((f) => ({ ...f, contentMode: mode }))}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {form.contentMode === 'write' ? (
                <textarea
                  className="w-full border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                  rows={8}
                  placeholder="Write the letter content here…"
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                />
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                  {form.attachmentUrl ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-slate-700">PDF attached</p>
                        <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View file</a>
                      </div>
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-500" onClick={() => setForm((f) => ({ ...f, attachmentUrl: '' }))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 mb-3">Upload a PDF file</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {uploading ? 'Uploading…' : 'Choose file'}
                      </Button>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Internal Notes (optional)</Label>
              <Input
                value={form.notes}
                placeholder="Notes visible to HR only…"
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editLetter ? 'Save Changes' : 'Issue Letter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View letter dialog */}
      <Dialog open={!!viewLetter} onOpenChange={() => setViewLetter(null)}>
        {viewLetter && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-blue-700">{viewLetter.letterNumber}</span>
                <span className="text-slate-400">·</span>
                <span className="text-base font-normal text-slate-600">{viewLetter.subject}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-400">Employee:</span> <span className="font-medium">{viewLetter.employee.fullNameEn}</span></div>
                <div><span className="text-slate-400">Type:</span> {typeBadge(viewLetter.letterType)}</div>
                <div><span className="text-slate-400">Classification:</span> <span className="font-medium">{viewLetter.classification}</span></div>
                <div><span className="text-slate-400">Issued:</span> <span className="font-medium">{new Date(viewLetter.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
              </div>
              {viewLetter.attachmentUrl ? (
                <a href={viewLetter.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 border rounded-lg hover:bg-blue-50 text-blue-700 transition-colors">
                  <FileText className="h-6 w-6" />
                  <span className="font-medium">Open attached PDF</span>
                  <ExternalLink className="h-4 w-4 ml-auto" />
                </a>
              ) : viewLetter.content ? (
                <div className="border rounded-lg p-4 bg-slate-50 whitespace-pre-wrap text-sm text-slate-700 max-h-[50vh] overflow-y-auto">
                  {viewLetter.content}
                </div>
              ) : null}
              {viewLetter.notes && (
                <div className="text-xs text-slate-500 border-t pt-3">
                  <span className="font-medium">Notes:</span> {viewLetter.notes}
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteLetter} onOpenChange={() => setDeleteLetter(null)}>
        {deleteLetter && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-rose-700">Delete Letter?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 py-2">
              This will permanently remove letter <strong>{deleteLetter.letterNumber}</strong>. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteLetter(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
