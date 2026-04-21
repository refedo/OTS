'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, Circle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingTask {
  id: string;
  labelEn: string;
  labelAr: string | null;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
}

interface Props { employeeId: string; dateOfJoining: string; }

export function EmployeeOnboardingTab({ dateOfJoining }: Props) {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hr/onboarding-tasks')
      .then(r => r.json())
      .then(d => setTasks(Array.isArray(d) ? d : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const daysOnboarded = Math.floor((Date.now() - new Date(dateOfJoining + 'T00:00:00').getTime()) / 86400000);
  const completed = checked.size;
  const required = tasks.filter(t => t.isRequired).length;
  const requiredDone = tasks.filter(t => t.isRequired && checked.has(t.id)).length;
  const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>;
  }

  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-3">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Progress</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{progress}%</p>
          <p className="text-xs text-emerald-500">{completed} / {tasks.length} tasks</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-3">
          <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Required</p>
          <p className="text-xl font-bold text-sky-700 mt-1">{requiredDone}/{required}</p>
          <p className="text-xs text-sky-500">mandatory tasks</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-3">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Days Joined</p>
          <p className="text-xl font-bold text-violet-700 mt-1">{Math.max(0, daysOnboarded)}</p>
          <p className="text-xs text-violet-500">since joining</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-3">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Pending</p>
          <p className="text-xl font-bold text-amber-700 mt-1">{tasks.length - completed}</p>
          <p className="text-xs text-amber-500">remaining</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl border bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Onboarding Progress</span>
          <span className="text-sm font-bold text-emerald-600">{progress}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">Check tasks off as they are completed during onboarding.</p>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-700">Onboarding Checklist</h3>
          <span className="text-xs text-slate-400 ml-auto">{tasks.length} items</span>
        </div>

        {tasks.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No onboarding tasks configured.</div>
        ) : (
          <div className="divide-y">
            {tasks.map(t => (
              <div
                key={t.id}
                className={cn('px-5 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors', checked.has(t.id) && 'bg-emerald-50/40')}
                onClick={() => toggle(t.id)}
              >
                <div className="mt-0.5 shrink-0">
                  {checked.has(t.id)
                    ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                    : <Circle className="h-4.5 w-4.5 text-slate-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium', checked.has(t.id) ? 'line-through text-slate-400' : 'text-slate-800')}>
                      {t.labelEn}
                    </span>
                    {t.isRequired && !checked.has(t.id) && (
                      <span className="flex items-center gap-0.5 text-xs text-rose-600 font-medium">
                        <AlertCircle className="h-3 w-3" />Required
                      </span>
                    )}
                  </div>
                  {t.description && <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
