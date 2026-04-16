'use client';

/**
 * 18.15.0 — Holiday Setup redesign: end date, total days, beautiful OTS styling.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  RefreshCw,
  Sun,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Holiday = {
  id: string;
  date: string;
  endDate: string | null;
  nameEn: string;
  nameAr: string | null;
  isRecurring: boolean;
};

type Props = { holidays: Holiday[]; canManage: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDays(start: string, end: string | null): number {
  if (!end) return 1;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 1;
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function totalHolidayDays(holidays: Holiday[]): number {
  return holidays.reduce((sum, h) => sum + calcDays(h.date, h.endDate), 0);
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

function HolidayFormDialog({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: Holiday | null;
}) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    date: initial?.date ?? '',
    endDate: initial?.endDate ?? '',
    nameEn: initial?.nameEn ?? '',
    nameAr: initial?.nameAr ?? '',
    isRecurring: initial?.isRecurring ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const days = form.date ? calcDays(form.date, form.endDate || null) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        endDate: form.endDate || null,
        nameEn: form.nameEn,
        nameAr: form.nameAr || null,
        isRecurring: form.isRecurring,
      };
      const url = isEdit ? `/api/hr/public-holidays/${initial!.id}` : '/api/hr/public-holidays';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
      onSaved();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Holiday' : 'Add Public Holiday'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update holiday details.' : 'Add a new public holiday to the calendar.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date *</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>End Date <span className="text-xs text-slate-400">(optional)</span></Label>
              <Input
                type="date"
                value={form.endDate}
                min={form.date || undefined}
                onChange={e => set('endDate', e.target.value)}
              />
            </div>
          </div>

          {form.date && (
            <div className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium flex items-center gap-2',
              days === 1 ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            )}>
              <Clock className="h-4 w-4" />
              <span>Duration: <strong>{days} day{days !== 1 ? 's' : ''}</strong></span>
            </div>
          )}

          <div className="space-y-1">
            <Label>Name (English) *</Label>
            <Input value={form.nameEn} onChange={e => set('nameEn', e.target.value)} placeholder="e.g. National Day" required />
          </div>
          <div className="space-y-1">
            <Label>Name (Arabic)</Label>
            <Input value={form.nameAr} onChange={e => set('nameAr', e.target.value)} dir="rtl" placeholder="اليوم الوطني" />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={form.isRecurring}
              onChange={e => set('isRecurring', e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="recurring" className="text-sm text-slate-700 cursor-pointer">
              Recurs yearly (annual holiday)
            </label>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.date || !form.nameEn}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Holiday'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({ open, holiday, onClose, onDeleted }: {
  open: boolean; holiday: Holiday | null; onClose: () => void; onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function handleDelete() {
    if (!holiday) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/hr/public-holidays/${holiday.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); return; }
      onDeleted(); onClose();
    } catch { setError('Network error'); } finally { setSaving(false); }
  }
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Holiday</DialogTitle>
          <DialogDescription>
            Remove <strong>{holiday?.nameEn}</strong> from the public holiday calendar?
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PublicHolidaysClient({ holidays: initialHolidays, canManage }: Props) {
  const router = useRouter();
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<Holiday | null>(null);
  const [deleteRow, setDeleteRow] = useState<Holiday | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/hr/public-holidays');
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.map((h: { id: string; date: string; endDate?: string | null; nameEn: string; nameAr?: string | null; isRecurring: boolean }) => ({
          ...h,
          date: h.date.slice(0, 10),
          endDate: h.endDate ? h.endDate.slice(0, 10) : null,
        })));
      }
    } finally {
      setRefreshing(false);
    }
  }

  const totalDays = totalHolidayDays(holidays);
  const recurring = holidays.filter(h => h.isRecurring).length;
  const multiDay = holidays.filter(h => h.endDate).length;

  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-amber-500 via-amber-400 to-orange-500 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Public Holidays</h1>
              </div>
              <p className="text-amber-100 text-sm">
                Configure official public holidays used in payroll calculations and attendance tracking.
              </p>
            </div>
            {canManage && (
              <Button onClick={() => setCreateOpen(true)} className="bg-white text-amber-700 hover:bg-amber-50 border-0 shadow-sm shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Holiday
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total Holidays</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{holidays.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">configured</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Days Off</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{totalDays}</p>
            <p className="text-xs text-emerald-500 mt-0.5">across all holidays</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Recurring</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{recurring}</p>
            <p className="text-xs text-sky-500 mt-0.5">annual holidays</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Multi-Day</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{multiDay}</p>
            <p className="text-xs text-violet-500 mt-0.5">with end date set</p>
          </div>
        </div>

        {/* Holiday List */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Holiday Calendar ({holidays.length})
            </h2>
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {sorted.length === 0 ? (
            <div className="py-16 text-center">
              <Sun className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No public holidays configured yet</p>
              {canManage && (
                <Button onClick={() => setCreateOpen(true)} className="mt-4" size="sm">
                  <Plus className="h-4 w-4 mr-2" />Add first holiday
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {sorted.map(h => {
                const days = calcDays(h.date, h.endDate);
                return (
                  <div key={h.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50 transition-colors">
                    {/* Date range */}
                    <div className="flex items-center gap-3 shrink-0 w-56">
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-semibold text-slate-800">{fmtDate(h.date)}</p>
                        {h.endDate && h.endDate !== h.date && (
                          <p className="text-xs text-slate-500">→ {fmtDate(h.endDate)}</p>
                        )}
                      </div>
                    </div>

                    {/* Names */}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{h.nameEn}</p>
                      {h.nameAr && <p className="text-xs text-slate-500 mt-0.5" dir="rtl">{h.nameAr}</p>}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                        days === 1 ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      )}>
                        <Clock className="h-3 w-3" />
                        {days} day{days !== 1 ? 's' : ''}
                      </span>
                      {h.isRecurring && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                          <RefreshCw className="h-3 w-3" />Yearly
                        </span>
                      )}
                      {!h.isRecurring && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border bg-slate-50 text-slate-600 border-slate-200">
                          <CheckCircle2 className="h-3 w-3" />One-off
                        </span>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditRow(h)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setDeleteRow(h)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {sorted.length > 0 && (
            <div className="px-6 py-3 border-t bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
              <span>{holidays.length} holiday{holidays.length !== 1 ? 's' : ''} · {totalDays} total days off</span>
              <span className="text-amber-600 font-medium">{recurring} recurring annually</span>
            </div>
          )}
        </div>
      </div>

      <HolidayFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={refresh} initial={null} />
      {editRow && <HolidayFormDialog open={!!editRow} onClose={() => setEditRow(null)} onSaved={refresh} initial={editRow} />}
      <DeleteDialog open={!!deleteRow} holiday={deleteRow} onClose={() => setDeleteRow(null)} onDeleted={refresh} />
    </div>
  );
}
