'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  Search,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Employee = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  occupation: string | null;
  department: string | null;
  section: string | null;
  dateOfJoining: string;
  nationalId: string | null;
};

const CHECKLIST = [
  { id: 'docs', label: 'Identity documents collected (Iqama, Passport)' },
  { id: 'contract', label: 'Employment contract signed' },
  { id: 'system', label: 'OTS system access granted' },
  { id: 'email', label: 'Company email account created' },
  { id: 'badge', label: 'Access badge issued' },
  { id: 'safety', label: 'Safety induction completed' },
  { id: 'uniform', label: 'PPE / Uniform issued' },
  { id: 'bank', label: 'Bank account / IBAN collected for WPS' },
  { id: 'gosi', label: 'GOSI registration submitted' },
  { id: 'medical', label: 'Medical insurance enrolled' },
];

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function OnboardingClient({ employees }: { employees: Employee[] }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, Set<string>>>({});

  const toggle = (empId: string, taskId: string) => {
    setChecked(prev => {
      const set = new Set(prev[empId] ?? []);
      if (set.has(taskId)) set.delete(taskId); else set.add(taskId);
      return { ...prev, [empId]: set };
    });
  };

  const filtered = employees.filter(e =>
    !search.trim() ||
    e.fullNameEn.toLowerCase().includes(search.toLowerCase()) ||
    e.employmentId.toLowerCase().includes(search.toLowerCase()) ||
    (e.occupation ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const completedToday = employees.filter(e => daysSince(e.dateOfJoining) <= 7).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <UserPlus className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Employee Onboarding</h1>
            </div>
            <p className="text-violet-100 text-sm">Track onboarding progress for employees who joined in the last 3 months</p>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Active Onboardings</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{employees.length}</p>
            <p className="text-xs text-violet-500 mt-0.5">last 3 months</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Joined This Week</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{completedToday}</p>
            <p className="text-xs text-emerald-500 mt-0.5">new in last 7 days</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Checklist Items</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{CHECKLIST.length}</p>
            <p className="text-xs text-sky-500 mt-0.5">per employee</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Avg Completion</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {employees.length > 0
                ? Math.round(employees.reduce((s, e) => s + daysSince(e.dateOfJoining), 0) / employees.length)
                : 0}
            </p>
            <p className="text-xs text-amber-500 mt-0.5">days since joining</p>
          </div>
        </div>

        {/* Employee list */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50/50 flex gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search employees…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <p className="text-xs text-slate-400 shrink-0">{filtered.length} employees</p>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <UserPlus className="h-10 w-10 mx-auto mb-2 text-slate-200" />
              <p className="font-medium">No new employees in the last 3 months</p>
              <p className="text-xs mt-1">New hires will appear here automatically</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(e => {
                const completedSet = checked[e.id] ?? new Set();
                const completedCount = completedSet.size;
                const pct = Math.round((completedCount / CHECKLIST.length) * 100);
                const isExpanded = expanded === e.id;
                const days = daysSince(e.dateOfJoining);

                return (
                  <div key={e.id}>
                    <button
                      className="w-full px-6 py-4 flex items-center gap-4 hover:bg-violet-50/30 transition-colors text-left"
                      onClick={() => setExpanded(isExpanded ? null : e.id)}
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                        {e.fullNameEn.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{e.fullNameEn}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {e.employmentId} · {e.occupation ?? 'No position'} · {e.department ?? 'No dept'}
                        </p>
                      </div>

                      {/* Progress */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-500' : 'bg-violet-400')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 tabular-nums w-8">{pct}%</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          {days === 0 ? 'Today' : `${days}d ago`}
                        </p>
                      </div>

                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                    </button>

                    {/* Checklist */}
                    {isExpanded && (
                      <div className="px-6 pb-4 border-t border-violet-100 bg-violet-50/20">
                        <div className="flex items-center justify-between py-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Onboarding Checklist</p>
                          <Link
                            href={`/hr/employees/${e.id}`}
                            className="text-xs text-violet-600 hover:underline flex items-center gap-1"
                          >
                            <User className="h-3 w-3" />
                            View profile
                          </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {CHECKLIST.map(task => {
                            const done = completedSet.has(task.id);
                            return (
                              <button
                                key={task.id}
                                onClick={() => toggle(e.id, task.id)}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-xs transition-all',
                                  done
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-violet-200'
                                )}
                              >
                                {done
                                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                  : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
                                <span className={cn(done && 'line-through opacity-70')}>{task.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
