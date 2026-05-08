'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Layers,
  Loader2,
  Plus,
  Trophy,
  Medal,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Zap,
  Bug,
  Wrench,
  Shield,
  RefreshCw,
  Lightbulb,
  FileBarChart,
  Sparkles,
  ArrowRight,
  Users,
  ListChecks,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { showConfirmation } from '@/components/ui/confirmation-dialog';

interface ContributorStat {
  id: string;
  name: string;
  total: number;
  completed: number;
}

interface CategoryStat {
  category: string;
  total: number;
  completed: number;
  inProgress: number;
}

interface TypeStat {
  type: string;
  total: number;
  completed: number;
}

interface DashboardData {
  kpis: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    planned: number;
    approved: number;
    underReview: number;
    idea: number;
    dropped: number;
    completionRate: number;
  };
  contributors: ContributorStat[];
  byCategory: CategoryStat[];
  byType: TypeStat[];
  byPriority: Record<string, number>;
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  CORE_SYSTEM:  { label: 'Core System',  color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-200' },
  PRODUCTION:   { label: 'Production',   color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
  DESIGN:       { label: 'Design',       color: 'text-pink-700',   bg: 'bg-pink-50',    border: 'border-pink-200' },
  DETAILING:    { label: 'Detailing',    color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  PROCUREMENT:  { label: 'Procurement',  color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-200' },
  QC:           { label: 'Quality',      color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
  LOGISTICS:    { label: 'Logistics',    color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  FINANCE:      { label: 'Finance',      color: 'text-emerald-700',bg: 'bg-emerald-50', border: 'border-emerald-200' },
  REPORTING:    { label: 'Reporting',    color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  AI:           { label: 'AI & Automation', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  GOVERNANCE:   { label: 'Governance',   color: 'text-slate-700',  bg: 'bg-slate-50',   border: 'border-slate-200' },
  PROJECTS:     { label: 'Projects',     color: 'text-cyan-700',   bg: 'bg-cyan-50',    border: 'border-cyan-200' },
  HR:           { label: 'HR',           color: 'text-rose-700',   bg: 'bg-rose-50',    border: 'border-rose-200' },
};

const TYPE_META: Record<string, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  FEATURE:     { label: 'Feature',     Icon: Sparkles,     color: 'text-violet-600', bg: 'bg-violet-50' },
  BUG:         { label: 'Bug Fix',     Icon: Bug,          color: 'text-red-600',    bg: 'bg-red-50' },
  TECH_DEBT:   { label: 'Tech Debt',   Icon: Wrench,       color: 'text-amber-600',  bg: 'bg-amber-50' },
  PERFORMANCE: { label: 'Performance', Icon: Zap,          color: 'text-yellow-600', bg: 'bg-yellow-50' },
  REPORTING:   { label: 'Reporting',   Icon: FileBarChart, color: 'text-blue-600',   bg: 'bg-blue-50' },
  REFACTOR:    { label: 'Refactor',    Icon: RefreshCw,    color: 'text-teal-600',   bg: 'bg-teal-50' },
  COMPLIANCE:  { label: 'Compliance',  Icon: Shield,       color: 'text-green-600',  bg: 'bg-green-50' },
  INSIGHT:     { label: 'Insight',     Icon: Lightbulb,    color: 'text-orange-600', bg: 'bg-orange-50' },
};

const RANK_STYLES = [
  { ring: 'ring-2 ring-yellow-400',  bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',   label: '1st', icon: Trophy },
  { ring: 'ring-2 ring-slate-400',   bg: 'bg-gradient-to-br from-slate-400 to-slate-500',     label: '2nd', icon: Medal },
  { ring: 'ring-2 ring-orange-400',  bg: 'bg-gradient-to-br from-orange-400 to-orange-500',   label: '3rd', icon: Medal },
];

const BACKLOG_TYPES = ['FEATURE', 'BUG', 'TECH_DEBT', 'PERFORMANCE', 'REPORTING', 'REFACTOR', 'COMPLIANCE', 'INSIGHT'];
const BACKLOG_CATEGORIES = ['CORE_SYSTEM', 'PRODUCTION', 'DESIGN', 'DETAILING', 'PROCUREMENT', 'QC', 'LOGISTICS', 'FINANCE', 'REPORTING', 'AI', 'GOVERNANCE', 'PROJECTS', 'HR'];
const BACKLOG_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function ContributorBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-600 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function BacklogDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'FEATURE',
    category: 'CORE_SYSTEM',
    priority: 'MEDIUM',
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/backlog/dashboard');
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch {
      // silently keep stale data on refetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleAddBacklog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          businessReason: formData.description,
          type: formData.type,
          category: formData.category,
          priority: formData.priority,
          affectedModules: [],
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setFormData({ title: '', description: '', type: 'FEATURE', category: 'CORE_SYSTEM', priority: 'MEDIUM' });
        await fetchData();
        showConfirmation({ type: 'success', title: 'Added', message: 'Backlog item created successfully.' });
      } else {
        const err = await res.json();
        showConfirmation({ type: 'error', title: 'Error', message: err.error || 'Failed to create item.' });
      }
    } catch {
      showConfirmation({ type: 'error', title: 'Error', message: 'Failed to create item.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-violet-600" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, contributors, byCategory, byType, byPriority } = data;
  const topContribCount = contributors[0]?.total ?? 1;
  const remaining = kpis.total - kpis.completed - kpis.dropped;

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 text-white">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative container mx-auto max-lg:pt-20 px-6 lg:px-8 py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <Layers className="size-5 text-violet-200" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-300">
                  Hexa Steel® OTS
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Backlog Dashboard</h1>
              <p className="max-w-lg text-sm text-violet-200/80">
                Live view of system development — contributions, completion progress, and domain coverage.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setDialogOpen(true)}
                className="gap-2 bg-white text-violet-900 hover:bg-violet-50 font-semibold shadow-lg"
              >
                <Plus className="size-4" />
                Add Backlog Item
              </Button>
              <Link href="/backlog">
                <Button variant="outline" className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm">
                  View Board
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="mt-8 rounded-2xl bg-white/10 backdrop-blur-sm p-5 border border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Overall Completion</p>
                <p className="text-5xl font-black tabular-nums mt-0.5">{kpis.completionRate}%</p>
              </div>
              <div className="flex gap-6 text-sm text-violet-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <strong className="text-white">{kpis.completed}</strong> done
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-violet-300" />
                  <strong className="text-white">{remaining}</strong> remaining
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers className="size-4 text-violet-300" />
                  <strong className="text-white">{kpis.total}</strong> total
                </span>
              </div>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000"
                style={{ width: `${kpis.completionRate}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-violet-300/70">
              {kpis.dropped > 0 && `${kpis.dropped} dropped · `}
              {kpis.inProgress} in progress · {kpis.planned + kpis.approved + kpis.underReview + kpis.idea} pipeline
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-8 py-8 space-y-8">
        {/* ── KPI Strip ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Total Items',   value: kpis.total,      Icon: ListChecks,   color: 'text-violet-600',  bg: 'bg-violet-50'  },
            { label: 'Completed',     value: kpis.completed,  Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'In Progress',   value: kpis.inProgress, Icon: TrendingUp,   color: 'text-blue-600',    bg: 'bg-blue-50'    },
            { label: 'Blocked',       value: kpis.blocked,    Icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-50'     },
            { label: 'Pipeline',      value: kpis.planned + kpis.approved + kpis.underReview + kpis.idea, Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Contributors',  value: contributors.length, Icon: Users,   color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
          ].map(({ label, value, Icon, color, bg }) => (
            <Card key={label} className="relative overflow-hidden border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`inline-flex size-8 items-center justify-center rounded-lg ${bg} mb-2`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Top Contributors + Type Breakdown ─────────────────── */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Contributors leaderboard */}
          <Card className="lg:col-span-3 overflow-hidden border-0 shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-5 text-amber-500" />
                Top Contributors
                <Badge variant="secondary" className="ml-auto text-xs">{contributors.length} active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {contributors.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">No contributions yet.</p>
              ) : (
                <ul className="divide-y">
                  {contributors.map((c, i) => {
                    const rank = RANK_STYLES[i];
                    const completionPct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
                    return (
                      <li key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                        {/* Rank */}
                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
                          ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                          {i + 1}
                        </span>

                        {/* Avatar */}
                        <Avatar className={`size-9 shrink-0 ${rank ? rank.ring : ''}`}>
                          <AvatarFallback className={`text-xs font-bold text-white ${rank ? rank.bg : 'bg-gradient-to-br from-violet-500 to-violet-600'}`}>
                            {getInitials(c.name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold truncate">{c.name}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="text-xs font-mono">
                                {c.total} item{c.total !== 1 ? 's' : ''}
                              </Badge>
                              {c.completed > 0 && (
                                <span className="text-xs text-emerald-600 font-medium">{completionPct}% done</span>
                              )}
                            </div>
                          </div>
                          <ContributorBar value={c.total} max={topContribCount} />
                        </div>

                        {i < 3 && (
                          <span className="shrink-0 text-lg">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Type Breakdown */}
          <Card className="lg:col-span-2 overflow-hidden border-0 shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-5 text-blue-500" />
                Development Types
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {byType.map(({ type, total: t, completed: c }) => {
                const meta = TYPE_META[type] ?? { label: type, Icon: Layers, color: 'text-muted-foreground', bg: 'bg-muted' };
                const pct = t > 0 ? Math.round((c / t) * 100) : 0;
                const { Icon } = meta;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                      <Icon className={`size-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{meta.label}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{c}/{t}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* ── Domain Categories ─────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="size-5 text-violet-600" />
                Development Domains
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Progress by system category</p>
            </div>
            <Badge variant="outline" className="text-xs">{byCategory.length} domains</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {byCategory.map(({ category, total: t, completed: c, inProgress: ip }) => {
              const meta = CATEGORY_META[category] ?? { label: category, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' };
              const pct = t > 0 ? Math.round((c / t) * 100) : 0;
              const remaining = t - c;
              return (
                <Link key={category} href={`/backlog?category=${category}`} className="group block">
                  <Card className={`h-full border ${meta.border} transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold tabular-nums">{t}</p>
                        <div className="text-right text-xs text-muted-foreground">
                          <p><span className="font-semibold text-emerald-600">{c}</span> done</p>
                          <p><span className="font-semibold">{remaining}</span> left</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{pct}% complete</span>
                          {ip > 0 && <span className="text-blue-600">{ip} active</span>}
                        </div>
                        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: pct === 100
                                ? 'linear-gradient(to right, #10b981, #059669)'
                                : 'linear-gradient(to right, #8b5cf6, #7c3aed)',
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Priority Distribution ─────────────────────────────── */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="size-5 text-orange-500" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { key: 'CRITICAL', label: 'Critical', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',    bar: '#ef4444' },
                { key: 'HIGH',     label: 'High',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', bar: '#f97316' },
                { key: 'MEDIUM',   label: 'Medium',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200',  bar: '#f59e0b' },
                { key: 'LOW',      label: 'Low',      color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',   bar: '#3b82f6' },
              ].map(({ key, label, color, bg, border, bar }) => {
                const count = byPriority[key] ?? 0;
                const pct = kpis.total > 0 ? Math.round((count / kpis.total) * 100) : 0;
                return (
                  <Link key={key} href={`/backlog?priority=${key}`} className="group block">
                    <div className={`rounded-xl border ${border} ${bg} p-4 space-y-2 transition-all hover:shadow-sm hover:-translate-y-0.5`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${color}`}>{label}</p>
                      <p className="text-3xl font-black tabular-nums">{count}</p>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{pct}% of total</p>
                        <div className="relative h-1.5 overflow-hidden rounded-full bg-black/10">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: bar }}
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Footer CTA ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between py-2 border-t">
          <p className="text-xs text-muted-foreground">Auto-refreshes every 2 minutes</p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => { setLoading(true); fetchData(); }}>
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              <Plus className="size-3.5" />
              Add Backlog
            </Button>
          </div>
        </div>
      </div>

      {/* ── Add Backlog Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-violet-600" />
              Add Backlog Item
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddBacklog} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dlg-desc">Description *</Label>
              <Textarea
                id="dlg-desc"
                required
                rows={3}
                placeholder="Describe the feature, bug, or improvement…"
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-title">Title *</Label>
              <Input
                id="dlg-title"
                required
                placeholder="Brief title"
                value={formData.title}
                onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKLOG_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {TYPE_META[t]?.label ?? t.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKLOG_CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {CATEGORY_META[c]?.label ?? c.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={v => setFormData(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKLOG_PRIORITIES.map(p => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              For full options (attachments, modules, AI generation)&nbsp;
              <Link href="/backlog/new" className="text-violet-600 hover:underline font-medium">
                use the full form →
              </Link>
            </p>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-violet-600 hover:bg-violet-700">
                {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                {submitting ? 'Creating…' : 'Create Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
