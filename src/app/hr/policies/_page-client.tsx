'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Search, Plus, FileText, Shield, Heart, Laptop,
  DollarSign, Users, Clock, ChevronRight, Pencil, Trash2,
  Globe, X, ChevronDown, ChevronUp, Upload, Loader2, Paperclip, Download,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Policy = {
  id: string;
  titleEn: string;
  titleAr: string | null;
  contentEn: string | null;
  contentAr: string | null;
  category: string;
  version: string;
  effectiveDate: string;
  status: string;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const CATEGORY_OPTIONS = [
  { value: 'HR', label: 'HR Policies', icon: Users, color: 'sky' },
  { value: 'Safety', label: 'Safety & Health', icon: Shield, color: 'emerald' },
  { value: 'Conduct', label: 'Code of Conduct', icon: Heart, color: 'violet' },
  { value: 'IT', label: 'IT & Security', icon: Laptop, color: 'amber' },
  { value: 'Finance', label: 'Finance & Expenses', icon: DollarSign, color: 'rose' },
];

const COLOR_MAP: Record<string, { badge: string; row: string; icon: string; header: string }> = {
  sky:     { badge: 'bg-sky-100 text-sky-700 border-sky-200',       row: 'border-sky-100 bg-sky-50/50',      icon: 'text-sky-600',     header: 'bg-sky-50/70' },
  emerald: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', row: 'border-emerald-100 bg-emerald-50/50', icon: 'text-emerald-600', header: 'bg-emerald-50/70' },
  violet:  { badge: 'bg-violet-100 text-violet-700 border-violet-200',   row: 'border-violet-100 bg-violet-50/50',   icon: 'text-violet-600',  header: 'bg-violet-50/70' },
  amber:   { badge: 'bg-amber-100 text-amber-700 border-amber-200',       row: 'border-amber-100 bg-amber-50/50',     icon: 'text-amber-600',   header: 'bg-amber-50/70' },
  rose:    { badge: 'bg-rose-100 text-rose-700 border-rose-200',           row: 'border-rose-100 bg-rose-50/50',       icon: 'text-rose-600',    header: 'bg-rose-50/70' },
};

const BLANK_FORM = {
  titleEn: '', titleAr: '', contentEn: '', contentAr: '',
  category: 'HR', version: 'v1.0', effectiveDate: '', attachmentUrl: '',
};

export function PoliciesClient() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Policy | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/policies');
      if (res.ok) setPolicies(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ ...BLANK_FORM });
    setEditTarget(null);
    setDialogMode('create');
  }

  function openEdit(p: Policy) {
    setForm({
      titleEn: p.titleEn, titleAr: p.titleAr ?? '',
      contentEn: p.contentEn ?? '', contentAr: p.contentAr ?? '',
      category: p.category, version: p.version,
      effectiveDate: p.effectiveDate.slice(0, 10),
      attachmentUrl: p.attachmentUrl ?? '',
    });
    setEditTarget(p);
    setDialogMode('edit');
  }

  async function save() {
    if (!form.titleEn.trim() || !form.effectiveDate || !form.category) return;
    setSaving(true);
    try {
      const isEdit = dialogMode === 'edit' && editTarget;
      const url = isEdit ? `/api/hr/policies/${editTarget.id}` : '/api/hr/policies';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleEn: form.titleEn,
          titleAr: form.titleAr || undefined,
          contentEn: form.contentEn || undefined,
          contentAr: form.contentAr || undefined,
          category: form.category,
          version: form.version,
          effectiveDate: form.effectiveDate,
          attachmentUrl: form.attachmentUrl || undefined,
        }),
      });
      if (res.ok) {
        setDialogMode(null);
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/hr/policies/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        load();
      }
    } finally {
      setDeleting(false);
    }
  }

  const grouped = CATEGORY_OPTIONS
    .filter(c => activeCategory === 'all' || c.value === activeCategory)
    .map(c => ({
      ...c,
      items: policies.filter(p =>
        p.category === c.value &&
        (p.status !== 'ARCHIVED') &&
        (!search.trim() ||
          p.titleEn.toLowerCase().includes(search.toLowerCase()) ||
          (p.titleAr ?? '').includes(search) ||
          (p.contentEn ?? '').toLowerCase().includes(search.toLowerCase()))
      ),
    }))
    .filter(c => c.items.length > 0);

  const totalActive = policies.filter(p => p.status !== 'ARCHIVED').length;
  const categories = Array.from(new Set(policies.map(p => p.category))).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Company Policies</h1>
              </div>
              <p className="text-emerald-100 text-sm">Official HR policies, code of conduct, and workplace guidelines</p>
            </div>
            <Button size="sm" onClick={openCreate} className="bg-white text-emerald-700 hover:bg-emerald-50 border-0 shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Policy
            </Button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Policies</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{totalActive}</p>
            <p className="text-xs text-emerald-500 mt-0.5">active policies</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Categories</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{categories}</p>
            <p className="text-xs text-sky-500 mt-0.5">policy groups</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">HR Policies</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{policies.filter(p => p.category === 'HR').length}</p>
            <p className="text-xs text-violet-500 mt-0.5">employee policies</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Safety</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{policies.filter(p => p.category === 'Safety').length}</p>
            <p className="text-xs text-amber-500 mt-0.5">safety policies</p>
          </div>
        </div>

        {/* Policy list */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b bg-slate-50/50 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search policies…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveCategory('all')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  activeCategory === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300')}>
                All
              </button>
              {CATEGORY_OPTIONS.map(c => (
                <button key={c.value} onClick={() => setActiveCategory(c.value)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    activeCategory === c.value
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300')}>
                  {c.label}
                </button>
              ))}
            </div>
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 transition-colors">
              <Globe className="h-3.5 w-3.5" />
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading…</div>
          ) : grouped.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <BookOpen className="h-10 w-10 mx-auto mb-2 text-slate-200" />
              <p>No policies yet. Click <strong>New Policy</strong> to add one.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {grouped.map(category => {
                const colors = COLOR_MAP[category.color] ?? COLOR_MAP.sky;
                const Icon = category.icon;
                return (
                  <div key={category.value}>
                    <div className={cn('px-6 py-3 flex items-center gap-2', colors.header)}>
                      <Icon className={cn('h-4 w-4', colors.icon)} />
                      <span className={cn('text-xs font-semibold uppercase tracking-wide', colors.icon)}>
                        {category.label}
                      </span>
                      <span className={cn('ml-auto text-xs px-2 py-0.5 rounded-full border font-medium', colors.badge)}>
                        {category.items.length}
                      </span>
                    </div>
                    {category.items.map(policy => {
                      const isExpanded = expandedId === policy.id;
                      const title = lang === 'ar' && policy.titleAr ? policy.titleAr : policy.titleEn;
                      const content = lang === 'ar' && policy.contentAr ? policy.contentAr : (policy.contentEn ?? '');
                      return (
                        <div key={policy.id} className="border-t border-slate-50">
                          <div
                            className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 cursor-pointer transition-colors group"
                            onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                          >
                            <div className={cn('p-2 rounded-lg border shrink-0', colors.row)}>
                              <FileText className={cn('h-4 w-4', colors.icon)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors', lang === 'ar' && 'text-right')} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                                {title}
                              </p>
                              {content && (
                                <p className={cn('text-xs text-slate-500 mt-0.5 line-clamp-1', lang === 'ar' && 'text-right')} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                                  {content}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0 mr-1">
                              <p className="text-xs text-slate-400">{policy.version}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Effective {policy.effectiveDate}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); openEdit(policy); }}
                                className="p-1.5 rounded hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setDeleteTarget(policy); }}
                                className="p-1.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                                : <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-6 pb-4 border-t border-slate-100 bg-slate-50/30">
                              {content && (
                                <p
                                  className={cn('text-sm text-slate-700 mt-4 leading-relaxed whitespace-pre-wrap', lang === 'ar' && 'text-right')}
                                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                                >
                                  {content}
                                </p>
                              )}
                              {policy.attachmentUrl && (
                                <a
                                  href={`/api/files?path=${encodeURIComponent(policy.attachmentUrl)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Download Attachment (PDF)
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={open => !open && setDialogMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'edit' ? 'Edit Policy' : 'New Policy'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title (English) <span className="text-rose-500">*</span></Label>
                <Input value={form.titleEn} onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} placeholder="Policy title in English" />
              </div>
              <div className="space-y-1.5">
                <Label>العنوان (عربي)</Label>
                <Input value={form.titleAr} onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))} placeholder="عنوان السياسة بالعربية" dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Category <span className="text-rose-500">*</span></Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="v1.0" />
              </div>
              <div className="space-y-1.5">
                <Label>Effective Date <span className="text-rose-500">*</span></Label>
                <Input type="date" value={form.effectiveDate} onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Content (English)</Label>
              <Textarea
                value={form.contentEn}
                onChange={e => setForm(f => ({ ...f, contentEn: e.target.value }))}
                placeholder="Policy content in English…"
                rows={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label>المحتوى (عربي)</Label>
              <Textarea
                value={form.contentAr}
                onChange={e => setForm(f => ({ ...f, contentAr: e.target.value }))}
                placeholder="محتوى السياسة بالعربية…"
                dir="rtl"
                rows={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />PDF Attachment</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={uploading}
                  onClick={() => {
                    const inp = document.createElement('input');
                    inp.type = 'file';
                    inp.accept = '.pdf';
                    inp.onchange = async (ev) => {
                      const file = (ev.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
                        if (res.ok) {
                          const data = await res.json();
                          setForm(f => ({ ...f, attachmentUrl: data.filePath }));
                        }
                      } finally {
                        setUploading(false);
                      }
                    };
                    inp.click();
                  }}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload PDF
                </Button>
                {form.attachmentUrl && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate max-w-[200px]">{form.attachmentUrl.split('/').pop()}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, attachmentUrl: '' }))} className="text-slate-400 hover:text-rose-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button
              onClick={save}
              disabled={saving || !form.titleEn.trim() || !form.effectiveDate || !form.category}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Saving…' : dialogMode === 'edit' ? 'Save Changes' : 'Create Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Policy</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{deleteTarget?.titleEn}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
