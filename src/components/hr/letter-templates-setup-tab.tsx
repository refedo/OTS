'use client';

/**
 * LetterTemplatesSetupTab — HR Setup tab for managing per-type letter templates.
 * Each template defines a reason code, bilingual subject, and bilingual body.
 * The "TASK_DELAY" reason code triggers the overdue-task picker in the letter dialog.
 *
 * 19.16.0
 */

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Save, X, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const LETTER_TYPES: { value: string; label: string }[] = [
  { value: 'QUESTIONING',           label: 'Questioning (مسائلة)' },
  { value: 'ATTENTION',             label: 'Attention (لفت نظر)' },
  { value: 'FIRST_WARNING',         label: 'First Warning (إنذار أول)' },
  { value: 'FINAL_WARNING',         label: 'Final Warning (إنذار نهائي)' },
  { value: 'NON_RENEWAL_NOTICE',    label: 'Non-Renewal Notice' },
  { value: 'DISMISSAL',             label: 'Dismissal (فصل)' },
  { value: 'SALARY_CERTIFICATE',    label: 'Salary Certificate' },
  { value: 'LEAVE_NOTICE',          label: 'Leave Notice' },
  { value: 'RETURN_FROM_LEAVE',     label: 'Return from Leave' },
  { value: 'PROBATION_EVALUATION',  label: 'Probation Evaluation' },
  { value: 'PERFORMANCE_APPRAISAL', label: 'Performance Appraisal' },
  { value: 'CLEARANCE_FORM',        label: 'Clearance Form' },
  { value: 'SALARY_NON_DISCLOSURE', label: 'Salary Non-Disclosure' },
  { value: 'OTHER',                 label: 'Other (أخرى)' },
];

type Template = {
  id: string;
  letterType: string;
  reasonCode: string;
  subjectAr: string;
  subjectEn: string;
  bodyAr: string | null;
  bodyEn: string | null;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY_FORM = {
  letterType: '',
  reasonCode: '',
  subjectAr: '',
  subjectEn: '',
  bodyAr: '',
  bodyEn: '',
  sortOrder: 0,
  isActive: true,
};

export function LetterTemplatesSetupTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/letters/templates');
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setShowForm(true);
    setError('');
  }

  function startEdit(t: Template) {
    setForm({
      letterType: t.letterType,
      reasonCode: t.reasonCode,
      subjectAr: t.subjectAr,
      subjectEn: t.subjectEn,
      bodyAr: t.bodyAr ?? '',
      bodyEn: t.bodyEn ?? '',
      sortOrder: t.sortOrder,
      isActive: t.isActive,
    });
    setEditingId(t.id);
    setShowForm(true);
    setError('');
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError('');
  }

  async function saveTemplate() {
    if (!form.letterType || !form.reasonCode || !form.subjectAr || !form.subjectEn) {
      setError('Letter type, reason code, and both subjects are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = editingId
        ? `/api/hr/letters/templates/${editingId}`
        : '/api/hr/letters/templates';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          bodyAr: form.bodyAr || null,
          bodyEn: form.bodyEn || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Save failed');
        return;
      }
      await loadTemplates();
      cancelForm();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/hr/letters/templates/${id}`, { method: 'DELETE' });
      if (res.ok) await loadTemplates();
    } finally {
      setDeletingId(null);
    }
  }

  function toggleType(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const filtered = filterType === 'ALL'
    ? templates
    : templates.filter((t) => t.letterType === filterType);

  const byType = filtered.reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.letterType] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All letter types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {LETTER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-500">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <Button size="sm" onClick={startCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              {editingId ? 'Edit Template' : 'New Template'}
            </h3>
            <Button variant="ghost" size="sm" onClick={cancelForm}><X className="h-4 w-4" /></Button>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Letter Type *</Label>
              <Select
                value={form.letterType}
                onValueChange={(v) => setForm((f) => ({ ...f, letterType: v }))}
                disabled={!!editingId}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {LETTER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason Code *</Label>
              <Input
                value={form.reasonCode}
                onChange={(e) => setForm((f) => ({ ...f, reasonCode: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                placeholder="e.g. TASK_DELAY"
              />
              <p className="text-xs text-slate-400">Use TASK_DELAY to trigger overdue task picker</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Subject (Arabic) *</Label>
              <Input
                value={form.subjectAr}
                onChange={(e) => setForm((f) => ({ ...f, subjectAr: e.target.value }))}
                dir="rtl"
                placeholder="عنوان الخطاب بالعربية"
              />
            </div>
            <div className="space-y-1">
              <Label>Subject (English) *</Label>
              <Input
                value={form.subjectEn}
                onChange={(e) => setForm((f) => ({ ...f, subjectEn: e.target.value }))}
                placeholder="Letter subject in English"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Body Template (Arabic)</Label>
              <Textarea
                value={form.bodyAr}
                onChange={(e) => setForm((f) => ({ ...f, bodyAr: e.target.value }))}
                dir="rtl"
                rows={5}
                placeholder="نص الخطاب الافتراضي بالعربية"
              />
            </div>
            <div className="space-y-1">
              <Label>Body Template (English)</Label>
              <Textarea
                value={form.bodyEn}
                onChange={(e) => setForm((f) => ({ ...f, bodyEn: e.target.value }))}
                rows={5}
                placeholder="Default letter body in English"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                className="w-20"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
            <Button onClick={saveTemplate} disabled={saving} className="gap-2 ml-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </div>
      )}

      {/* Template list grouped by type */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : Object.keys(byType).length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No templates found. Add one to pre-fill letter subjects and bodies.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(byType).map(([type, rows]) => {
            const typeLabel = LETTER_TYPES.find((t) => t.value === type)?.label ?? type;
            const isOpen = expandedTypes.has(type);
            return (
              <div key={type} className="rounded-xl border bg-white overflow-hidden shadow-sm">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 text-left"
                  onClick={() => toggleType(type)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-500" />
                    <span className="font-medium text-slate-700 text-sm">{typeLabel}</span>
                    <Badge variant="secondary" className="text-xs">{rows.length}</Badge>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="border-t divide-y">
                    {rows.map((t) => (
                      <div key={t.id} className="px-4 py-3 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono">{t.reasonCode}</Badge>
                            {!t.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          </div>
                          <p className="text-sm font-medium text-slate-800">{t.subjectAr}</p>
                          <p className="text-xs text-slate-500">{t.subjectEn}</p>
                          {t.bodyAr && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2 dir-rtl">{t.bodyAr}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500 hover:text-rose-700"
                            disabled={deletingId === t.id}
                            onClick={() => deleteTemplate(t.id)}
                          >
                            {deletingId === t.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
