'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, Search, Plus, Users, Clock, BookMarked, Award,
  Calendar, Tag, Pencil, Trash2, Globe,
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

type TrainingProgram = {
  id: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  descriptionAr: string | null;
  category: string;
  durationHours: number;
  targetAudience: string | null;
  scheduledDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

const CATEGORY_OPTIONS = ['Safety', 'Technical', 'Management', 'IT & Systems', 'Compliance', 'General'];

const STATUS_OPTIONS = [
  { value: 'PLANNED',   label: 'Planned',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'UPCOMING',  label: 'Upcoming',  cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'ONGOING',   label: 'Ongoing',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'COMPLETED', label: 'Completed', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Safety:        'bg-rose-100 text-rose-700 border-rose-200',
  Technical:     'bg-sky-100 text-sky-700 border-sky-200',
  'IT & Systems':'bg-violet-100 text-violet-700 border-violet-200',
  Management:    'bg-amber-100 text-amber-700 border-amber-200',
  Compliance:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  General:       'bg-slate-100 text-slate-600 border-slate-200',
};

const BLANK_FORM = {
  titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '',
  category: 'General', durationHours: 0, targetAudience: '',
  scheduledDate: '', status: 'PLANNED', notes: '',
};

export function TrainingClient({
  activeEmployeeCount,
  occupations,
}: {
  activeEmployeeCount: number;
  occupations: string[];
}) {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lang, setLang] = useState<'en' | 'ar'>('en');

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<TrainingProgram | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingProgram | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hr/training-programs');
      if (res.ok) setPrograms(await res.json());
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

  function openEdit(p: TrainingProgram) {
    setForm({
      titleEn: p.titleEn, titleAr: p.titleAr ?? '',
      descriptionEn: p.descriptionEn ?? '', descriptionAr: p.descriptionAr ?? '',
      category: p.category, durationHours: p.durationHours,
      targetAudience: p.targetAudience ?? '',
      scheduledDate: p.scheduledDate ?? '',
      status: p.status, notes: p.notes ?? '',
    });
    setEditTarget(p);
    setDialogMode('edit');
  }

  async function save() {
    if (!form.titleEn.trim()) return;
    setSaving(true);
    try {
      const isEdit = dialogMode === 'edit' && editTarget;
      const url = isEdit ? `/api/hr/training-programs/${editTarget.id}` : '/api/hr/training-programs';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleEn: form.titleEn,
          titleAr: form.titleAr || undefined,
          descriptionEn: form.descriptionEn || undefined,
          descriptionAr: form.descriptionAr || undefined,
          category: form.category,
          durationHours: form.durationHours,
          targetAudience: form.targetAudience || undefined,
          scheduledDate: form.scheduledDate || undefined,
          status: form.status,
          notes: form.notes || undefined,
        }),
      });
      if (res.ok) { setDialogMode(null); load(); }
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/hr/training-programs/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { setDeleteTarget(null); load(); }
    } finally {
      setDeleting(false);
    }
  }

  const categories = Array.from(new Set(programs.map(p => p.category)));

  const filtered = programs.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    return (
      p.titleEn.toLowerCase().includes(search.toLowerCase()) ||
      (p.titleAr ?? '').includes(search) ||
      (p.descriptionEn ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.targetAudience ?? '').toLowerCase().includes(search.toLowerCase())
    );
  });

  const upcomingCount = programs.filter(p => p.status === 'UPCOMING').length;
  const plannedCount = programs.filter(p => p.status === 'PLANNED').length;

  function statusConfig(status: string) {
    return STATUS_OPTIONS.find(s => s.value === status) ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Employee Training</h1>
              </div>
              <p className="text-amber-100 text-sm">Manage training programs, schedules, and employee skill development</p>
            </div>
            <Button size="sm" onClick={openCreate} className="bg-white text-amber-700 hover:bg-amber-50 border-0 shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Program
            </Button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total Programs</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{programs.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">training programs</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5 text-sky-600" />
              <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Upcoming</p>
            </div>
            <p className="text-2xl font-bold text-sky-700">{upcomingCount}</p>
            <p className="text-xs text-sky-500 mt-0.5">scheduled sessions</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-violet-600" />
              <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Active Staff</p>
            </div>
            <p className="text-2xl font-bold text-violet-700">{activeEmployeeCount}</p>
            <p className="text-xs text-violet-500 mt-0.5">eligible employees</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Categories</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{categories.length}</p>
            <p className="text-xs text-emerald-500 mt-0.5">training areas</p>
          </div>
        </div>

        {/* Programs */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="px-6 py-4 border-b bg-slate-50/50 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search programs…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryFilter('all')}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  categoryFilter === 'all'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300')}>
                All
              </button>
              {categories.map(c => (
                <button key={c} onClick={() => setCategoryFilter(c)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    categoryFilter === c
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300')}>
                  {c}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:border-amber-300 transition-colors">
              <Globe className="h-3.5 w-3.5" />
              {lang === 'en' ? 'عربي' : 'EN'}
            </button>
          </div>

          {/* Program list */}
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="py-16 text-center text-slate-400">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <GraduationCap className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                <p>{programs.length === 0 ? 'No programs yet. Click New Program to add one.' : 'No programs match your search.'}</p>
              </div>
            ) : (
              filtered.map(program => {
                const catColor = CATEGORY_COLORS[program.category] ?? 'bg-slate-100 text-slate-600 border-slate-200';
                const sc = statusConfig(program.status);
                const title = lang === 'ar' && program.titleAr ? program.titleAr : program.titleEn;
                const description = lang === 'ar' && program.descriptionAr ? program.descriptionAr : (program.descriptionEn ?? '');
                return (
                  <div key={program.id} className="px-6 py-5 flex items-start gap-4 hover:bg-amber-50/20 transition-colors group">
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 shrink-0">
                      <BookMarked className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className={cn('text-sm font-semibold text-slate-800 group-hover:text-amber-700 transition-colors', lang === 'ar' && 'text-right')} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                          {title}
                        </p>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', catColor)}>
                          {program.category}
                        </span>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', sc.cls)}>
                          {sc.label}
                        </span>
                      </div>
                      {description && (
                        <p className={cn('text-xs text-slate-500 line-clamp-2 mb-2', lang === 'ar' && 'text-right')} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                          {description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        {program.durationHours > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {program.durationHours}h
                          </span>
                        )}
                        {program.targetAudience && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {program.targetAudience}
                          </span>
                        )}
                        {program.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {program.scheduledDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-1">
                      <button onClick={() => openEdit(program)} className="p-1.5 rounded hover:bg-amber-100 text-slate-400 hover:text-amber-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(program)} className="p-1.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Occupation coverage note */}
        {occupations.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">Position Titles in Organization</p>
            <div className="flex flex-wrap gap-2">
              {occupations.map(o => (
                <span key={o} className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">{o}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={open => !open && setDialogMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'edit' ? 'Edit Training Program' : 'New Training Program'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Title (English) <span className="text-rose-500">*</span></Label>
                <Input value={form.titleEn} onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} placeholder="Program title in English" />
              </div>
              <div className="space-y-1.5">
                <Label>العنوان (عربي)</Label>
                <Input value={form.titleAr} onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))} placeholder="عنوان البرنامج بالعربية" dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration (hours)</Label>
                <Input type="number" min={0} value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Scheduled Date</Label>
                <Input type="date" value={form.scheduledDate} onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Target Audience</Label>
              <Input value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} placeholder="e.g. All Production Staff, Supervisors, QC Inspectors" />
            </div>
            <div className="space-y-1.5">
              <Label>Description (English)</Label>
              <Textarea value={form.descriptionEn} onChange={e => setForm(f => ({ ...f, descriptionEn: e.target.value }))} placeholder="Program description in English…" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف (عربي)</Label>
              <Textarea value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} placeholder="وصف البرنامج بالعربية…" dir="rtl" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.titleEn.trim()} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? 'Saving…' : dialogMode === 'edit' ? 'Save Changes' : 'Create Program'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Training Program</DialogTitle>
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
