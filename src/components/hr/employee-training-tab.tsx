'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, Clock, Calendar, Users, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingProgram {
  id: string;
  titleEn: string;
  titleAr: string | null;
  descriptionEn: string | null;
  category: string;
  durationHours: number;
  targetAudience: string | null;
  scheduledDate: string | null;
  status: 'PLANNED' | 'UPCOMING' | 'ONGOING' | 'COMPLETED';
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PLANNED:   { label: 'Planned',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  UPCOMING:  { label: 'Upcoming',  cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  ONGOING:   { label: 'Ongoing',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  COMPLETED: { label: 'Completed', cls: 'bg-violet-100 text-violet-700 border-violet-200' },
};

const CATEGORY_COLORS: Record<string, string> = {
  Safety: 'bg-rose-100 text-rose-700 border-rose-200',
  Technical: 'bg-sky-100 text-sky-700 border-sky-200',
  Leadership: 'bg-violet-100 text-violet-700 border-violet-200',
  HR: 'bg-amber-100 text-amber-700 border-amber-200',
  Finance: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  General: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function EmployeeTrainingTab() {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hr/training-programs')
      .then(r => r.json())
      .then(d => setPrograms(Array.isArray(d) ? d : []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false));
  }, []);

  const active = programs.filter(p => p.status === 'ONGOING' || p.status === 'UPCOMING').length;
  const completed = programs.filter(p => p.status === 'COMPLETED').length;
  const totalHours = programs.reduce((s, p) => s + p.durationHours, 0);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-3">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Total Programs</p>
          <p className="text-xl font-bold text-violet-700 mt-1">{programs.length}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-3">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Completed</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{completed}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-3">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Active Programs</p>
          <p className="text-xl font-bold text-sky-700 mt-1">{active}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-700">Training Programs</h3>
          <span className="text-xs text-slate-400 ml-auto">{totalHours}h total training</span>
        </div>

        {programs.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No training programs found.</div>
        ) : (
          <div className="divide-y">
            {programs.map(p => {
              const sc = STATUS_CFG[p.status] ?? STATUS_CFG.PLANNED;
              const cc = CATEGORY_COLORS[p.category] ?? CATEGORY_COLORS.General;
              return (
                <div key={p.id} className="px-5 py-4 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.status === 'COMPLETED' && <CheckCircle2 className="h-4 w-4 text-violet-500 shrink-0" />}
                    <span className="text-sm font-semibold text-slate-800">{p.titleEn}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium', cc)}>{p.category}</span>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium', sc.cls)}>{sc.label}</span>
                  </div>
                  {p.descriptionEn && <p className="text-xs text-slate-500">{p.descriptionEn}</p>}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    {p.durationHours > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.durationHours}h</span>}
                    {p.scheduledDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.scheduledDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                    {p.targetAudience && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.targetAudience}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
