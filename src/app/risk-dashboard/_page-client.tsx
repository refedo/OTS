'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  Users,
  Package,
  TrendingDown,
  GitBranch,
  RefreshCw,
  Loader2,
  ChevronRight,
  ExternalLink,
  Filter,
  Zap,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AffectedItem {
  type: string;
  id: string;
  name: string;
  link: string;
}

interface Project {
  id: string;
  projectNumber: string;
  name: string;
}

interface LeadingIndicator {
  id: string;
  level: 'critical' | 'high' | 'medium' | 'low';
  category: 'task_delay' | 'cascade_risk' | 'resource_overload' | 'procurement_risk' | 'schedule_slip';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  affectedItems: AffectedItem[];
  project?: Project;
  detectedAt: string;
  daysUntilImpact?: number;
  metadata?: Record<string, unknown>;
}

interface LeadingIndicatorsSummary {
  totalRisks: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: {
    task_delay: number;
    cascade_risk: number;
    resource_overload: number;
    procurement_risk: number;
    schedule_slip: number;
  };
  indicators: LeadingIndicator[];
  generatedAt: string;
}

const levelConfig = {
  critical: { 
    color: 'bg-red-100 text-red-800 border-red-300', 
    bgColor: 'bg-red-50',
    icon: AlertTriangle, 
    iconColor: 'text-red-600',
    label: 'Critical',
    dot: 'bg-red-500',
  },
  high: { 
    color: 'bg-orange-100 text-orange-800 border-orange-300', 
    bgColor: 'bg-orange-50',
    icon: AlertCircle, 
    iconColor: 'text-orange-600',
    label: 'High',
    dot: 'bg-orange-500',
  },
  medium: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
    bgColor: 'bg-yellow-50',
    icon: AlertCircle, 
    iconColor: 'text-yellow-600',
    label: 'Medium',
    dot: 'bg-yellow-500',
  },
  low: { 
    color: 'bg-blue-100 text-blue-800 border-blue-300', 
    bgColor: 'bg-blue-50',
    icon: AlertCircle, 
    iconColor: 'text-blue-600',
    label: 'Low',
    dot: 'bg-blue-500',
  },
};

const categoryConfig = {
  task_delay: { 
    icon: Clock, 
    label: 'Task Delay', 
    description: 'Tasks not started but due soon',
    color: 'text-red-600',
  },
  cascade_risk: { 
    icon: GitBranch, 
    label: 'Cascade Risk', 
    description: 'Upstream delays affecting downstream',
    color: 'text-purple-600',
  },
  resource_overload: { 
    icon: Users, 
    label: 'Resource Overload', 
    description: 'Team members with too many tasks',
    color: 'text-orange-600',
  },
  procurement_risk: { 
    icon: Package, 
    label: 'Procurement Risk', 
    description: 'Materials not ready for upcoming work',
    color: 'text-blue-600',
  },
  schedule_slip: { 
    icon: TrendingDown, 
    label: 'Schedule Slip', 
    description: 'Behind planned progress',
    color: 'text-yellow-600',
  },
  capacity_overload: { 
    icon: TrendingDown, 
    label: 'Capacity Overload', 
    description: 'Production capacity exceeded',
    color: 'text-red-600',
  },
};

type RuleResult = {
  ruleName: string;
  risksDetected: number;
  risksCreated: number;
  risksAlreadyExist: number;
  risksSuppressedByTracker?: number;
  risksAutoResolved?: number;
  errors: string[];
};

type EngineRunResult = {
  runAt: string;
  totalRisksDetected: number;
  totalRisksCreated: number;
  duration: number;
  ruleResults: RuleResult[];
};

type EngineSummary = {
  totalActive: number;
  recentlyResolved: number;
  bySeverity: { severity: string; count: number }[];
  byType: { type: string; count: number }[];
};

type RiskEvent = {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'DELAY' | 'DEPENDENCY' | 'OVERLOAD' | 'BOTTLENECK';
  affectedProjectIds: string[];
  affectedWorkUnitIds: string[];
  reason: string;
  recommendedAction: string;
  metadata?: Record<string, unknown>;
  detectedAt: string;
};

const TYPE_TO_CATEGORY: Record<string, string> = {
  DELAY: 'task_delay',
  DEPENDENCY: 'cascade_risk',
  OVERLOAD: 'capacity_overload',
  BOTTLENECK: 'cascade_risk',
};

export default function RiskDashboardPage() {
  const [data, setData] = useState<LeadingIndicatorsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<EngineRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'live' | 'engine'>('live');
  const [engineSummary, setEngineSummary] = useState<EngineSummary | null>(null);
  const [engineRisks, setEngineRisks] = useState<RiskEvent[]>([]);
  const [engineLoading, setEngineLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leading-indicators');
      if (!response.ok) throw new Error('Failed to fetch risk data');
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchEngineData = async () => {
    setEngineLoading(true);
    try {
      const [summaryRes, risksRes] = await Promise.all([
        fetch('/api/risk-events/summary'),
        fetch('/api/risk-events'),
      ]);
      if (summaryRes.ok) setEngineSummary(await summaryRes.json());
      if (risksRes.ok) {
        const body = await risksRes.json();
        setEngineRisks(body.data ?? []);
      }
    } finally {
      setEngineLoading(false);
    }
  };

  const runEngine = async () => {
    setRunning(true);
    setRunError(null);
    setLastRunResult(null);
    try {
      const res = await fetch('/api/risk-events/run', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Engine run failed');
      setLastRunResult(body as EngineRunResult);
      await fetchEngineData();
      setViewMode('engine');
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Engine run failed');
    } finally {
      setRunning(false);
    }
  };

  const switchToLive = async () => {
    setViewMode('live');
    if (!data) await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ----- derived counts -----
  const sevCount = (sev: string) => engineSummary?.bySeverity.find(s => s.severity === sev)?.count ?? 0;
  const liveTotal   = data?.totalRisks ?? 0;
  const liveCrit    = data?.critical ?? 0;
  const liveHigh    = data?.high ?? 0;
  const liveMed     = data?.medium ?? 0;
  const liveLow     = data?.low ?? 0;
  const engTotal    = engineSummary?.totalActive ?? 0;
  const engCrit     = sevCount('CRITICAL');
  const engHigh     = sevCount('HIGH');
  const engMed      = sevCount('MEDIUM');
  const engLow      = sevCount('LOW');

  const totalRisks  = viewMode === 'engine' ? engTotal  : liveTotal;
  const critCount   = viewMode === 'engine' ? engCrit   : liveCrit;
  const highCount   = viewMode === 'engine' ? engHigh   : liveHigh;
  const medCount    = viewMode === 'engine' ? engMed    : liveMed;
  const lowCount    = viewMode === 'engine' ? engLow    : liveLow;

  // filter engine risks
  const filteredEngine = engineRisks.filter(r => {
    if (selectedLevel) {
      const map: Record<string, string> = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };
      if (r.severity !== map[selectedLevel]) return false;
    }
    if (selectedCategory && TYPE_TO_CATEGORY[r.type] !== selectedCategory) return false;
    return true;
  });

  const filteredIndicators = data?.indicators.filter(indicator => {
    if (selectedCategory && indicator.category !== selectedCategory) return false;
    if (selectedLevel && indicator.level !== selectedLevel) return false;
    return true;
  }) || [];

  const isBusy = loading || running || engineLoading;

  if (loading && viewMode === 'live') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Analyzing risks…</p>
        </div>
      </div>
    );
  }

  if (error && viewMode === 'live') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-500" />
          <p className="mt-2 text-red-600">{error}</p>
          <Button onClick={fetchData} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Hero */}
      <div className="rounded-2xl border bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Zap className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Early Warning System</h1>
            </div>
            <p className="text-orange-100 text-sm">
              {viewMode === 'engine'
                ? 'Showing engine results — tracker-linked, suppression-aware risk events stored in the database'
                : 'Live leading indicators — real-time computation from tasks, resources & schedule data'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-white/15 rounded-lg p-1 backdrop-blur-sm">
              <button
                onClick={switchToLive}
                disabled={isBusy}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'live' ? 'bg-white text-orange-700 shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                Live
              </button>
              <button
                onClick={fetchEngineData}
                disabled={isBusy || !engineSummary}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'engine' ? 'bg-white text-orange-700 shadow-sm' : 'text-white/80 hover:text-white disabled:opacity-40'}`}
              >
                Engine
              </button>
            </div>
            <Button onClick={viewMode === 'live' ? fetchData : fetchEngineData} variant="secondary" disabled={isBusy}
              className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={runEngine} disabled={isBusy}
              className="bg-white text-orange-700 hover:bg-orange-50 border-0 shadow-sm">
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {running ? 'Running…' : 'Run Engine'}
            </Button>
          </div>
        </div>
      </div>

      {/* Engine run result strip */}
      {lastRunResult && !runError && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
          <div className="flex items-center gap-2 font-semibold text-emerald-800 mb-1.5 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Engine run complete — {lastRunResult.totalRisksDetected} detected, {lastRunResult.totalRisksCreated} new · {lastRunResult.duration}ms
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-emerald-700">
            {lastRunResult.ruleResults.map((r) => (
              <span key={r.ruleName} className="flex items-center gap-1 flex-wrap">
                <span className="font-medium">{r.ruleName}:</span>
                <span>{r.risksDetected} detected</span>
                {r.risksCreated > 0 && <span className="text-emerald-600 font-medium">· {r.risksCreated} new</span>}
                {(r.risksSuppressedByTracker ?? 0) > 0 && <span className="text-sky-600 font-medium">· {r.risksSuppressedByTracker} suppressed by tracker</span>}
                {(r.risksAutoResolved ?? 0) > 0 && <span className="text-violet-600 font-medium">· {r.risksAutoResolved} auto-resolved</span>}
                {r.errors.length > 0 && <span className="text-rose-600 font-medium">· {r.errors.length} errors</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {runError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm flex items-start gap-2 text-rose-800">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Engine run failed: {runError}</span>
        </div>
      )}

      {/* KPI tiles — engine-aware */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Risks', value: totalRisks, color: 'slate', dot: null, level: null },
          { label: 'Critical', value: critCount, color: 'red', dot: 'bg-red-500', level: 'critical' },
          { label: 'High', value: highCount, color: 'orange', dot: 'bg-orange-500', level: 'high' },
          { label: 'Medium', value: medCount, color: 'yellow', dot: 'bg-yellow-500', level: 'medium' },
          { label: 'Low', value: lowCount, color: 'blue', dot: 'bg-blue-500', level: 'low' },
        ].map(({ label, value, color, dot, level }) => {
          const isActive = selectedLevel === level;
          const borderCls = color === 'slate' ? 'border-slate-200' : color === 'red' ? 'border-red-200' : color === 'orange' ? 'border-orange-200' : color === 'yellow' ? 'border-yellow-200' : 'border-blue-200';
          const ringCls   = color === 'slate' ? 'ring-slate-400' : color === 'red' ? 'ring-red-500' : color === 'orange' ? 'ring-orange-500' : color === 'yellow' ? 'ring-yellow-500' : 'ring-blue-500';
          const valCls    = color === 'slate' ? 'text-slate-900' : color === 'red' ? 'text-red-600' : color === 'orange' ? 'text-orange-600' : color === 'yellow' ? 'text-yellow-600' : 'text-blue-600';
          return (
            <button
              key={label}
              onClick={() => setSelectedLevel(isActive ? null : level)}
              className={`rounded-xl border bg-white shadow-sm p-4 text-left transition-all hover:shadow-md ${borderCls} ${isActive ? `ring-2 ${ringCls}` : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                {dot && <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />}
                <span className={`text-3xl font-bold tabular-nums ${valCls}`}>{value}</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
              {viewMode === 'engine' && engineSummary && label === 'Total Risks' && (
                <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">tracker-linked</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Category filter */}
      <div className="rounded-xl border bg-white shadow-sm p-4">
        <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold mb-3">
          <Filter className="h-4 w-4" />
          Filter by Category
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={selectedCategory === null ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)}>
            All ({totalRisks})
          </Button>
          {Object.entries(categoryConfig).map(([key, config]) => {
            const count = viewMode === 'engine'
              ? engineRisks.filter(r => TYPE_TO_CATEGORY[r.type] === key).length
              : (data?.byCategory[key as keyof typeof data.byCategory] ?? 0);
            const Icon = config.icon;
            return (
              <Button key={key} variant={selectedCategory === key ? 'default' : 'outline'} size="sm"
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)} className="gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${selectedCategory !== key ? config.color : ''}`} />
                {config.label} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Risk list */}
      <div className="space-y-4">
        {viewMode === 'engine' ? (
          engineLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading engine risks…</span>
            </div>
          ) : filteredEngine.length === 0 ? (
            <div className="rounded-xl border bg-white shadow-sm py-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
              <h3 className="text-base font-semibold text-emerald-700">No active risk events</h3>
              <p className="text-sm text-slate-400 mt-1">
                {selectedCategory || selectedLevel ? 'No risks match your filters.' : 'Run the engine to detect risks, or all previously detected risks have been resolved.'}
              </p>
            </div>
          ) : (
            filteredEngine.map((risk) => {
              const sev = risk.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
              const cfg = levelConfig[sev];
              const LevelIcon = cfg.icon;
              const catKey = TYPE_TO_CATEGORY[risk.type] as keyof typeof categoryConfig;
              const catCfg = categoryConfig[catKey] ?? categoryConfig.task_delay;
              const CatIcon = catCfg.icon;
              const isTrackerSource = risk.metadata?.source === 'tracker';
              return (
                <div key={risk.id}
                  className={`rounded-xl border bg-white shadow-sm overflow-hidden border-l-4 ${sev === 'critical' ? 'border-l-red-500' : sev === 'high' ? 'border-l-orange-500' : sev === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg shrink-0 ${cfg.bgColor}`}>
                        <LevelIcon className={`h-5 w-5 ${cfg.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <CatIcon className={`h-3 w-3 ${catCfg.color}`} />
                            {catCfg.label}
                          </span>
                          {isTrackerSource && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium border border-sky-200">
                              <Zap className="h-2.5 w-2.5" /> Tracker
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 ml-auto">
                            {new Date(risk.detectedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 mt-2 leading-relaxed">{risk.reason}</p>
                        <div className="mt-4 grid md:grid-cols-2 gap-3">
                          <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                            <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wide mb-1">Recommended Action</p>
                            <p className="text-xs text-rose-800 leading-relaxed">{risk.recommendedAction}</p>
                          </div>
                          {risk.affectedProjectIds.length > 0 && (
                            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Affected Projects</p>
                              <p className="text-xs text-slate-700 font-mono">{risk.affectedProjectIds.length} project{risk.affectedProjectIds.length !== 1 ? 's' : ''}</p>
                              {risk.affectedWorkUnitIds.length > 0 && (
                                <p className="text-xs text-slate-400 mt-0.5">{risk.affectedWorkUnitIds.length} work unit{risk.affectedWorkUnitIds.length !== 1 ? 's' : ''}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          filteredIndicators.length === 0 ? (
            <div className="rounded-xl border bg-white shadow-sm py-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
              <h3 className="text-base font-semibold text-emerald-700">No Risks Detected</h3>
              <p className="text-sm text-slate-400 mt-1">
                {selectedCategory || selectedLevel ? 'No risks match your current filters.' : 'All systems operating normally. Great job!'}
              </p>
            </div>
          ) : (
            filteredIndicators.map((indicator) => {
              const levelCfg = levelConfig[indicator.level];
              const categoryCfg = categoryConfig[indicator.category];
              const LevelIcon = levelCfg.icon;
              const CategoryIcon = categoryCfg.icon;
              return (
                <div key={indicator.id}
                  className={`rounded-xl border bg-white shadow-sm overflow-hidden border-l-4 ${indicator.level === 'critical' ? 'border-l-red-500' : indicator.level === 'high' ? 'border-l-orange-500' : indicator.level === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg shrink-0 ${levelCfg.bgColor}`}>
                        <LevelIcon className={`h-5 w-5 ${levelCfg.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900">{indicator.title}</h3>
                              <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${levelCfg.color}`}>{levelCfg.label}</span>
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <CategoryIcon className={`h-3 w-3 ${categoryCfg.color}`} />
                                {categoryCfg.label}
                              </span>
                            </div>
                            {indicator.project && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Project: {indicator.project.projectNumber} — {indicator.project.name}
                              </p>
                            )}
                          </div>
                          {indicator.daysUntilImpact !== undefined && indicator.daysUntilImpact >= 0 && (
                            <div className="text-right shrink-0">
                              <div className={`text-2xl font-bold tabular-nums ${indicator.daysUntilImpact <= 3 ? 'text-red-600' : indicator.daysUntilImpact <= 7 ? 'text-orange-600' : 'text-slate-500'}`}>
                                {indicator.daysUntilImpact}
                              </div>
                              <div className="text-[10px] text-slate-400">days until impact</div>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{indicator.description}</p>
                        <div className="mt-4 grid md:grid-cols-2 gap-3">
                          <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                            <p className="text-[10px] font-semibold text-rose-700 uppercase tracking-wide mb-1">Impact</p>
                            <p className="text-xs text-rose-800 leading-relaxed">{indicator.impact}</p>
                          </div>
                          <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">Recommendation</p>
                            <p className="text-xs text-emerald-800 leading-relaxed">{indicator.recommendation}</p>
                          </div>
                        </div>
                        {indicator.affectedItems.length > 0 && (
                          <div className="mt-3">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Affected Items</p>
                            <div className="flex flex-wrap gap-1.5">
                              {indicator.affectedItems.slice(0, 5).map((item, idx) => (
                                <Link key={idx} href={item.link}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs text-slate-700 transition-colors">
                                  {item.type}: {item.name}
                                  <ExternalLink className="h-3 w-3 text-slate-400" />
                                </Link>
                              ))}
                              {indicator.affectedItems.length > 5 && (
                                <span className="px-2 py-1 text-xs text-slate-400">+{indicator.affectedItems.length - 5} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400">
        {viewMode === 'engine' && engineSummary
          ? `Engine view · ${engTotal} active, ${engineSummary.recentlyResolved} recently resolved · tracker-integrated`
          : data
            ? `Live view · generated ${new Date(data.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`
            : ''}
      </p>
    </div>
    </div>
  );
}
