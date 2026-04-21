'use client';

/**
 * CirculationsTab — multi-recipient broadcast letters with CEO approval.
 * 19.16.0
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Megaphone, Plus, Loader2, Eye, Pencil, Trash2, CheckCircle, XCircle,
  Languages, Users, Building2, Globe, Upload, FileText, X,
} from 'lucide-react';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  DRAFT:       { label: 'Draft',       cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  PENDING_CEO: { label: 'Pending CEO', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  APPROVED:    { label: 'Approved',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED:    { label: 'Rejected',    cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

type Department = { id: string; name: string };
type Employee = { id: string; fullNameEn: string; employmentId: string };

type Recipient = {
  id: string;
  employee: { id: string; fullNameEn: string; employmentId: string } | null;
  department: { id: string; name: string } | null;
};

type Circulation = {
  id: string;
  circulationNumber: string;
  subject: string;
  subjectEn: string | null;
  content: string | null;
  contentEn: string | null;
  language: string;
  status: string;
  targetType: string;
  attachmentUrl: string | null;
  issuedAt: string;
  notes: string | null;
  rejectionReason: string | null;
  createdBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  rejectedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  recipients: Recipient[];
};

type Props = {
  departments: Department[];
  employees: Employee[];
  canManage: boolean;
  canApproveCeo: boolean;
};

const EMPTY_FORM = {
  subject: '',
  subjectEn: '',
  content: '',
  contentEn: '',
  language: 'ARABIC' as 'ARABIC' | 'ENGLISH' | 'BILINGUAL',
  targetType: 'ALL' as 'ALL' | 'DEPARTMENTS' | 'EMPLOYEES',
  issuedAt: new Date().toISOString().slice(0, 10),
  notes: '',
  attachmentUrl: '',
  departmentIds: [] as string[],
  employeeIds: [] as string[],
};

export function CirculationsTab({ departments, employees, canManage, canApproveCeo }: Props) {
  const [circs, setCircs] = useState<Circulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCirc, setEditCirc] = useState<Circulation | null>(null);
  const [viewCirc, setViewCirc] = useState<Circulation | null>(null);
  const [deleteCirc, setDeleteCirc] = useState<Circulation | null>(null);
  const [approveCirc, setApproveCirc] = useState<Circulation | null>(null);
  const [rejectCirc, setRejectCirc] = useState<Circulation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [empSearch, setEmpSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadCircs(); }, []);

  async function loadCircs() {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/circulations');
      if (res.ok) setCircs(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditCirc(null);
    setForm({ ...EMPTY_FORM, issuedAt: new Date().toISOString().slice(0, 10) });
    setFormError('');
    setDialogOpen(true);
  }

  function openEdit(c: Circulation) {
    setEditCirc(c);
    setForm({
      subject: c.subject,
      subjectEn: c.subjectEn ?? '',
      content: c.content ?? '',
      contentEn: c.contentEn ?? '',
      language: (c.language as typeof EMPTY_FORM.language),
      targetType: (c.targetType as typeof EMPTY_FORM.targetType),
      issuedAt: c.issuedAt.slice(0, 10),
      notes: c.notes ?? '',
      attachmentUrl: c.attachmentUrl ?? '',
      departmentIds: c.recipients.filter((r) => r.department).map((r) => r.department!.id),
      employeeIds: c.recipients.filter((r) => r.employee).map((r) => r.employee!.id),
    });
    setFormError('');
    setDialogOpen(true);
  }

  async function handleTranslate() {
    if (!form.content.trim()) return setFormError('Write the Arabic content first');
    setTranslating(true);
    setFormError('');
    try {
      const res = await fetch('/api/hr/letters/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: form.content, sourceLang: 'ARABIC' }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm((f) => ({ ...f, contentEn: data.translated, subjectEn: f.subjectEn || f.subject }));
    } catch {
      setFormError('Auto-translation failed');
    } finally {
      setTranslating(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm((f) => ({ ...f, attachmentUrl: data.filePath }));
    } catch {
      setFormError('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!form.subject.trim()) return setFormError('Subject is required');
    if (form.targetType === 'DEPARTMENTS' && form.departmentIds.length === 0)
      return setFormError('Select at least one department');
    if (form.targetType === 'EMPLOYEES' && form.employeeIds.length === 0)
      return setFormError('Select at least one employee');

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        subject: form.subject.trim(),
        subjectEn: form.subjectEn.trim() || undefined,
        content: form.content.trim() || undefined,
        contentEn: form.contentEn.trim() || undefined,
        language: form.language,
        targetType: form.targetType,
        issuedAt: form.issuedAt,
        notes: form.notes.trim() || undefined,
        attachmentUrl: form.attachmentUrl || undefined,
        departmentIds: form.targetType === 'DEPARTMENTS' ? form.departmentIds : undefined,
        employeeIds: form.targetType === 'EMPLOYEES' ? form.employeeIds : undefined,
      };

      const url = editCirc ? `/api/hr/circulations/${editCirc.id}` : '/api/hr/circulations';
      const method = editCirc ? 'PATCH' : 'POST';
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
      loadCircs();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteCirc) return;
    setDeleting(true);
    try {
      await fetch(`/api/hr/circulations/${deleteCirc.id}`, { method: 'DELETE' });
      setDeleteCirc(null);
      loadCircs();
    } finally {
      setDeleting(false);
    }
  }

  async function handleApprove() {
    if (!approveCirc) return;
    setApproving(true);
    setActionError('');
    try {
      const res = await fetch(`/api/hr/circulations/${approveCirc.id}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed');
      setApproveCirc(null);
      loadCircs();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectCirc || !rejectReason.trim()) return;
    setRejecting(true);
    setActionError('');
    try {
      const res = await fetch(`/api/hr/circulations/${rejectCirc.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed');
      setRejectCirc(null);
      setRejectReason('');
      loadCircs();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRejecting(false);
    }
  }

  function toggleDept(id: string) {
    setForm((f) => ({
      ...f,
      departmentIds: f.departmentIds.includes(id)
        ? f.departmentIds.filter((d) => d !== id)
        : [...f.departmentIds, id],
    }));
  }

  function toggleEmp(id: string) {
    setForm((f) => ({
      ...f,
      employeeIds: f.employeeIds.includes(id)
        ? f.employeeIds.filter((e) => e !== id)
        : [...f.employeeIds, id],
    }));
  }

  const filteredEmps = employees.filter((e) => {
    const q = empSearch.toLowerCase();
    return !q || e.fullNameEn.toLowerCase().includes(q) || e.employmentId.includes(q);
  });

  function recipientSummary(c: Circulation) {
    if (c.targetType === 'ALL') return 'All Employees';
    if (c.targetType === 'DEPARTMENTS') {
      const depts = c.recipients.filter((r) => r.department).map((r) => r.department!.name);
      return depts.length ? depts.join(', ') : 'No departments';
    }
    const emps = c.recipients.filter((r) => r.employee);
    return `${emps.length} employee${emps.length !== 1 ? 's' : ''}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{circs.length} circulation{circs.length !== 1 ? 's' : ''}</p>
        {canManage && (
          <Button onClick={openCreate} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Circulation
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>
      ) : circs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No circulations yet</p>
          <p className="text-sm mt-1">Circulations are broadcast letters sent to multiple employees or departments.</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Number</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipients</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {circs.map((c) => {
                  const s = STATUS_CFG[c.status] ?? STATUS_CFG.PENDING_CEO;
                  return (
                    <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {c.circulationNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate font-medium text-slate-800">{c.subject}</p>
                        <p className="text-xs text-slate-400">{c.language}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          {c.targetType === 'ALL' && <Globe className="h-3.5 w-3.5 text-sky-500" />}
                          {c.targetType === 'DEPARTMENTS' && <Building2 className="h-3.5 w-3.5 text-violet-500" />}
                          {c.targetType === 'EMPLOYEES' && <Users className="h-3.5 w-3.5 text-emerald-500" />}
                          <span className="truncate max-w-[160px]">{recipientSummary(c)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(c.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setViewCirc(c)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {canApproveCeo && c.status === 'PENDING_CEO' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50" title="Approve" onClick={() => { setApproveCirc(c); setActionError(''); }}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50" title="Reject" onClick={() => { setRejectCirc(c); setRejectReason(''); setActionError(''); }}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {canManage && c.status === 'PENDING_CEO' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700" onClick={() => openEdit(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => setDeleteCirc(c)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              {editCirc ? 'Edit Circulation' : 'New Circulation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">

            {/* Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Subject (Arabic) <span className="text-rose-500">*</span></Label>
                <Input dir="rtl" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="عنوان التعميم" />
              </div>
              <div className="space-y-1">
                <Label>Subject (English)</Label>
                <Input value={form.subjectEn} onChange={(e) => setForm((f) => ({ ...f, subjectEn: e.target.value }))} placeholder="Circulation subject" />
              </div>
            </div>

            {/* Language */}
            <div>
              <Label className="mb-2 block">Language</Label>
              <div className="flex rounded-lg border overflow-hidden w-fit">
                {([['ARABIC', 'Arabic (عربي)'], ['ENGLISH', 'English'], ['BILINGUAL', 'Bilingual']] as const).map(([val, lbl]) => (
                  <button key={val} type="button"
                    className={`px-4 py-1.5 text-sm transition-colors ${form.language === val ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    onClick={() => setForm((f) => ({ ...f, language: val }))}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-1">
              <Label>{form.language === 'ENGLISH' ? 'Content (English)' : 'Content (Arabic)'}</Label>
              <Textarea dir={form.language === 'ENGLISH' ? 'ltr' : 'rtl'} rows={5} value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder={form.language === 'ENGLISH' ? 'Circulation body…' : 'نص التعميم…'} />
            </div>

            {form.language === 'BILINGUAL' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Content (English)</Label>
                  <button type="button" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    onClick={handleTranslate} disabled={translating || !form.content.trim()}>
                    {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                    {translating ? 'Translating…' : 'Auto-translate'}
                  </button>
                </div>
                <Textarea rows={5} value={form.contentEn} onChange={(e) => setForm((f) => ({ ...f, contentEn: e.target.value }))}
                  placeholder="English translation…" />
              </div>
            )}

            {/* Attachment */}
            <div className="space-y-1">
              <Label>Attachment (optional)</Label>
              {form.attachmentUrl ? (
                <div className="flex items-center gap-3 border rounded-lg px-3 py-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex-1 truncate">View attachment</a>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400" onClick={() => setForm((f) => ({ ...f, attachmentUrl: '' }))}><X className="h-3.5 w-3.5" /></Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? 'Uploading…' : 'Upload PDF'}
                </Button>
              )}
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} />
            </div>

            {/* Target */}
            <div>
              <Label className="mb-2 block">Audience / Recipients</Label>
              <div className="flex rounded-lg border overflow-hidden w-fit mb-3">
                {([['ALL', 'All Employees', Globe], ['DEPARTMENTS', 'By Department', Building2], ['EMPLOYEES', 'Specific Employees', Users]] as const).map(([val, lbl, Icon]) => (
                  <button key={val} type="button"
                    className={`px-4 py-1.5 text-sm transition-colors flex items-center gap-1.5 ${form.targetType === val ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    onClick={() => setForm((f) => ({ ...f, targetType: val }))}>
                    <Icon className="h-3.5 w-3.5" />{lbl}
                  </button>
                ))}
              </div>

              {form.targetType === 'DEPARTMENTS' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {departments.map((d) => (
                    <label key={d.id} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded cursor-pointer transition-colors ${form.departmentIds.includes(d.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={form.departmentIds.includes(d.id)} onChange={() => toggleDept(d.id)} className="accent-blue-600" />
                      {d.name}
                    </label>
                  ))}
                </div>
              )}

              {form.targetType === 'EMPLOYEES' && (
                <div className="border rounded-lg p-2 space-y-2">
                  <Input value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="Search employees…" className="h-8 text-sm" />
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {filteredEmps.slice(0, 30).map((e) => (
                      <label key={e.id} className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded cursor-pointer transition-colors ${form.employeeIds.includes(e.id) ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={form.employeeIds.includes(e.id)} onChange={() => toggleEmp(e.id)} className="accent-blue-600" />
                        <span className="flex-1 truncate">{e.fullNameEn}</span>
                        <span className="text-xs text-slate-400">{e.employmentId}</span>
                      </label>
                    ))}
                  </div>
                  {form.employeeIds.length > 0 && (
                    <p className="text-xs text-blue-600">{form.employeeIds.length} employee{form.employeeIds.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div>
              )}
            </div>

            {/* Issue date */}
            <div className="space-y-1">
              <Label>Issue Date</Label>
              <Input type="date" value={form.issuedAt} onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))} className="w-40" />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>Internal Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notes visible to HR only…" />
            </div>

            {formError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">{formError}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editCirc ? 'Save Changes' : 'Issue Circulation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewCirc} onOpenChange={() => setViewCirc(null)}>
        {viewCirc && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-blue-700">{viewCirc.circulationNumber}</span>
                <span className="text-slate-400">·</span>
                <span className="text-base font-normal text-slate-600 truncate">{viewCirc.subject}</span>
                {(() => { const s = STATUS_CFG[viewCirc.status] ?? STATUS_CFG.PENDING_CEO; return (
                  <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
                ); })()}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-400">Language:</span> <span className="font-medium">{viewCirc.language}</span></div>
                <div><span className="text-slate-400">Audience:</span> <span className="font-medium">{recipientSummary(viewCirc)}</span></div>
                <div><span className="text-slate-400">Issued:</span> <span className="font-medium">{new Date(viewCirc.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                <div><span className="text-slate-400">By:</span> <span className="font-medium">{viewCirc.createdBy.name}</span></div>
              </div>
              {viewCirc.content && (
                <div className="rounded-lg bg-slate-50 border p-4 whitespace-pre-wrap leading-relaxed" dir="rtl">{viewCirc.content}</div>
              )}
              {viewCirc.contentEn && (
                <div className="rounded-lg bg-slate-50 border p-4 whitespace-pre-wrap leading-relaxed">{viewCirc.contentEn}</div>
              )}
              {viewCirc.attachmentUrl && (
                <a href={viewCirc.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <FileText className="h-4 w-4" /> View Attachment
                </a>
              )}
              {viewCirc.status === 'APPROVED' && viewCirc.approvedBy && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm">
                  <span className="text-emerald-700 font-medium">Approved</span> by {viewCirc.approvedBy.name}
                  {viewCirc.approvedAt && ` on ${new Date(viewCirc.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                </div>
              )}
              {viewCirc.status === 'REJECTED' && viewCirc.rejectedBy && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm">
                  <span className="text-rose-700 font-medium">Rejected</span> by {viewCirc.rejectedBy.name}: {viewCirc.rejectionReason}
                </div>
              )}
              {canApproveCeo && viewCirc.status === 'PENDING_CEO' && (
                <div className="flex gap-3 pt-2 border-t">
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => { setApproveCirc(viewCirc); setViewCirc(null); setActionError(''); }}>
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 gap-2" onClick={() => { setRejectCirc(viewCirc); setViewCirc(null); setRejectReason(''); setActionError(''); }}>
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Approve confirm */}
      <Dialog open={!!approveCirc} onOpenChange={() => setApproveCirc(null)}>
        {approveCirc && (
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Approve Circulation?</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600 py-2">Approve <strong>{approveCirc.circulationNumber}</strong>? This will notify all recipients.</p>
            {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setApproveCirc(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprove} disabled={approving}>
                {approving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Approve
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectCirc} onOpenChange={() => setRejectCirc(null)}>
        {rejectCirc && (
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Reject Circulation</DialogTitle></DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm text-slate-600">Rejecting <strong>{rejectCirc.circulationNumber}</strong></p>
              <div className="space-y-1">
                <Label>Reason *</Label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" rows={3}
                  value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection…" />
              </div>
              {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectCirc(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
                {rejecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reject
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteCirc} onOpenChange={() => setDeleteCirc(null)}>
        {deleteCirc && (
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete Circulation?</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600 py-2">Delete <strong>{deleteCirc.circulationNumber}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteCirc(null)}>Cancel</Button>
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
