'use client';

import { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  FileText,
  Shield,
  Heart,
  Laptop,
  DollarSign,
  Users,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PolicyCategory = {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  policies: Policy[];
};

type Policy = {
  id: string;
  title: string;
  description: string;
  effectiveDate: string;
  version: string;
};

const CATEGORIES: PolicyCategory[] = [
  {
    id: 'hr',
    label: 'HR Policies',
    icon: <Users className="h-4 w-4" />,
    color: 'sky',
    policies: [
      { id: 'hr-1', title: 'Leave Policy', description: 'Annual leave, sick leave, emergency leave entitlements and procedures.', effectiveDate: '2026-01-01', version: 'v2.1' },
      { id: 'hr-2', title: 'Attendance & Working Hours', description: 'Standard working hours, overtime rules, and attendance tracking requirements.', effectiveDate: '2026-01-01', version: 'v1.5' },
      { id: 'hr-3', title: 'Recruitment & Onboarding', description: 'Hiring process, reference checks, and new employee onboarding procedures.', effectiveDate: '2025-07-01', version: 'v1.2' },
    ],
  },
  {
    id: 'safety',
    label: 'Safety & Health',
    icon: <Shield className="h-4 w-4" />,
    color: 'emerald',
    policies: [
      { id: 'safe-1', title: 'Workplace Safety Policy', description: 'Safety procedures, PPE requirements, and incident reporting protocols.', effectiveDate: '2026-01-01', version: 'v3.0' },
      { id: 'safe-2', title: 'Emergency Response Plan', description: 'Fire evacuation, first aid procedures, and emergency contact information.', effectiveDate: '2025-06-01', version: 'v2.0' },
    ],
  },
  {
    id: 'conduct',
    label: 'Code of Conduct',
    icon: <Heart className="h-4 w-4" />,
    color: 'violet',
    policies: [
      { id: 'cod-1', title: 'Code of Conduct', description: 'Professional behavior standards, anti-harassment, and ethics guidelines.', effectiveDate: '2025-01-01', version: 'v4.1' },
      { id: 'cod-2', title: 'Conflict of Interest', description: 'Disclosure requirements and restrictions on outside business activities.', effectiveDate: '2025-01-01', version: 'v1.0' },
    ],
  },
  {
    id: 'it',
    label: 'IT & Security',
    icon: <Laptop className="h-4 w-4" />,
    color: 'amber',
    policies: [
      { id: 'it-1', title: 'IT Acceptable Use Policy', description: 'Company equipment, internet, email, and software usage rules.', effectiveDate: '2026-01-01', version: 'v2.3' },
      { id: 'it-2', title: 'Data Privacy & Confidentiality', description: 'Employee and company data handling, storage, and disclosure restrictions.', effectiveDate: '2026-01-01', version: 'v1.8' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Expenses',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'rose',
    policies: [
      { id: 'fin-1', title: 'Expense Reimbursement Policy', description: 'Eligible expenses, approval workflow, and reimbursement timelines.', effectiveDate: '2025-10-01', version: 'v1.4' },
    ],
  },
];

const COLOR_MAP: Record<string, { badge: string; row: string; icon: string }> = {
  sky:    { badge: 'bg-sky-100 text-sky-700 border-sky-200',    row: 'border-sky-200 bg-sky-50',    icon: 'text-sky-600' },
  emerald:{ badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', row: 'border-emerald-200 bg-emerald-50', icon: 'text-emerald-600' },
  violet: { badge: 'bg-violet-100 text-violet-700 border-violet-200',   row: 'border-violet-200 bg-violet-50',   icon: 'text-violet-600' },
  amber:  { badge: 'bg-amber-100 text-amber-700 border-amber-200',      row: 'border-amber-200 bg-amber-50',     icon: 'text-amber-600' },
  rose:   { badge: 'bg-rose-100 text-rose-700 border-rose-200',         row: 'border-rose-200 bg-rose-50',       icon: 'text-rose-600' },
};

export function PoliciesClient() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const totalPolicies = CATEGORIES.reduce((s, c) => s + c.policies.length, 0);

  const filtered = CATEGORIES
    .filter(c => activeCategory === 'all' || c.id === activeCategory)
    .map(c => ({
      ...c,
      policies: c.policies.filter(p =>
        !search.trim() ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(c => c.policies.length > 0);

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
            <Button size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50 border-0 shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              New Policy
            </Button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Total Policies</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{totalPolicies}</p>
            <p className="text-xs text-emerald-500 mt-0.5">across all categories</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Categories</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{CATEGORIES.length}</p>
            <p className="text-xs text-sky-500 mt-0.5">policy groups</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Updated 2026</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">7</p>
            <p className="text-xs text-violet-500 mt-0.5">policies revised</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Due Review</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">2</p>
            <p className="text-xs text-amber-500 mt-0.5">need annual review</p>
          </div>
        </div>

        {/* Filters + Content */}
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
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1',
                    activeCategory === c.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300')}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Policy list */}
          <div className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <BookOpen className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                <p>No policies match your search.</p>
              </div>
            ) : (
              filtered.map(category => {
                const colors = COLOR_MAP[category.color] ?? COLOR_MAP.sky;
                return (
                  <div key={category.id}>
                    {/* Category header */}
                    <div className="px-6 py-3 bg-slate-50/70 flex items-center gap-2">
                      <span className={cn('flex items-center gap-1 text-xs font-semibold uppercase tracking-wide', colors.icon)}>
                        {category.icon}
                        {category.label}
                      </span>
                      <span className={cn('ml-auto text-xs px-2 py-0.5 rounded-full border font-medium', colors.badge)}>
                        {category.policies.length}
                      </span>
                    </div>
                    {/* Policy rows */}
                    {category.policies.map(policy => (
                      <div
                        key={policy.id}
                        className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 cursor-pointer transition-colors group"
                      >
                        <div className={cn('p-2 rounded-lg border', colors.row)}>
                          <FileText className={cn('h-4 w-4', colors.icon)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">{policy.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{policy.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-400">{policy.version}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Effective {policy.effectiveDate}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
