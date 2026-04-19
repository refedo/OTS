'use client';

import { useState } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Users,
  Clock,
  BookMarked,
  Award,
  ChevronRight,
  Calendar,
  Tag,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TrainingProgram = {
  id: string;
  title: string;
  category: string;
  description: string;
  durationHours: number;
  targetAudience: string;
  scheduledDate: string | null;
  status: 'upcoming' | 'ongoing' | 'completed' | 'planned';
  enrolledCount: number;
  completedCount: number;
};

const SAMPLE_PROGRAMS: TrainingProgram[] = [
  {
    id: 'tr-1',
    title: 'Workplace Safety & PPE',
    category: 'Safety',
    description: 'Mandatory safety induction covering PPE usage, hazard identification, and emergency procedures for all production staff.',
    durationHours: 8,
    targetAudience: 'All Production Staff',
    scheduledDate: '2026-05-10',
    status: 'upcoming',
    enrolledCount: 0,
    completedCount: 0,
  },
  {
    id: 'tr-2',
    title: 'Steel Fabrication Quality Standards',
    category: 'Technical',
    description: 'ISO 9001 quality control standards specific to structural steel fabrication processes.',
    durationHours: 16,
    targetAudience: 'Fabricators, QC Inspectors',
    scheduledDate: '2026-05-20',
    status: 'upcoming',
    enrolledCount: 0,
    completedCount: 0,
  },
  {
    id: 'tr-3',
    title: 'OTS System Training',
    category: 'IT & Systems',
    description: 'Hands-on training for using the OTS ERP system including attendance, tasks, and project tracking.',
    durationHours: 4,
    targetAudience: 'All Staff',
    scheduledDate: null,
    status: 'planned',
    enrolledCount: 0,
    completedCount: 0,
  },
  {
    id: 'tr-4',
    title: 'First Aid & Emergency Response',
    category: 'Safety',
    description: 'Basic first aid, fire fighting equipment usage, and emergency evacuation procedures.',
    durationHours: 6,
    targetAudience: 'Site Supervisors, Safety Officers',
    scheduledDate: '2026-06-01',
    status: 'planned',
    enrolledCount: 0,
    completedCount: 0,
  },
  {
    id: 'tr-5',
    title: 'Leadership & Team Management',
    category: 'Management',
    description: 'Supervisory skills, team communication, conflict resolution, and performance management.',
    durationHours: 12,
    targetAudience: 'Supervisors, Foremen',
    scheduledDate: '2026-06-15',
    status: 'planned',
    enrolledCount: 0,
    completedCount: 0,
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Safety:      'bg-rose-100 text-rose-700 border-rose-200',
  Technical:   'bg-sky-100 text-sky-700 border-sky-200',
  'IT & Systems': 'bg-violet-100 text-violet-700 border-violet-200',
  Management:  'bg-amber-100 text-amber-700 border-amber-200',
  Compliance:  'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  upcoming:  { label: 'Upcoming',  cls: 'bg-sky-100 text-sky-700 border-sky-200' },
  ongoing:   { label: 'Ongoing',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  planned:   { label: 'Planned',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export function TrainingClient({
  activeEmployeeCount,
  occupations,
}: {
  activeEmployeeCount: number;
  occupations: string[];
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = Array.from(new Set(SAMPLE_PROGRAMS.map(p => p.category)));

  const filtered = SAMPLE_PROGRAMS.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    return (
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.targetAudience.toLowerCase().includes(search.toLowerCase())
    );
  });

  const upcomingCount = SAMPLE_PROGRAMS.filter(p => p.status === 'upcoming').length;
  const plannedCount = SAMPLE_PROGRAMS.filter(p => p.status === 'planned').length;

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
              <p className="text-amber-100 text-sm">
                Manage training programs, schedules, and employee skill development
              </p>
            </div>
            <Button size="sm" className="bg-white text-amber-700 hover:bg-amber-50 border-0 shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Program
            </Button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total Programs</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{SAMPLE_PROGRAMS.length}</p>
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
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    categoryFilter === c
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300')}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Program list */}
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <GraduationCap className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                <p>No programs match your search.</p>
              </div>
            ) : (
              filtered.map(program => {
                const catColor = CATEGORY_COLORS[program.category] ?? 'bg-slate-100 text-slate-600 border-slate-200';
                const statusCfg = STATUS_CONFIG[program.status];
                return (
                  <div key={program.id} className="px-6 py-5 flex items-start gap-4 hover:bg-amber-50/20 cursor-pointer transition-colors group">
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 shrink-0">
                      <BookMarked className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-amber-700 transition-colors">
                          {program.title}
                        </p>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', catColor)}>
                          {program.category}
                        </span>
                        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', statusCfg.cls)}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{program.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {program.durationHours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {program.targetAudience}
                        </span>
                        {program.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {program.scheduledDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 mt-1 shrink-0" />
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
                <span key={o} className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                  {o}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
