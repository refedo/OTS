'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Check,
  Play,
  Minus,
  Sun,
  Moon,
  Search,
  Activity,
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// --- Types ---

interface ActivityData {
  id: string;
  activityType: string;
  activityLabel: string;
  percentage: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface ScopeData {
  id: string;
  scopeType: string;
  scopeLabel: string;
  activities: ActivityData[];
}

interface BuildingData {
  id: string;
  name: string;
  designation: string;
  weight: number | null;
  scopes: ScopeData[];
  overallProgress: number;
  currentStage: { label: string; index: number } | null;
}

interface ProjectData {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  contractualTonnage: number | null;
  buildings: BuildingData[];
  overallProgress: number;
}

interface Stats {
  activeProjects: number;
  totalBuildings: number;
  inProgress: number;
  completed: number;
  blocked: number;
}

interface TrackerResponse {
  stats: Stats;
  projects: ProjectData[];
}

// --- Constants ---

const ACTIVITY_COLUMNS = [
  { type: 'arch_approval', label: 'ARCH DRAWING' },
  { type: 'design', label: 'DESIGN STAGE' },
  { type: 'design_approval', label: 'DESIGN APPROVAL' },
  { type: 'detailing', label: 'SHOP DRAWINGS' },
  { type: 'detailing_approval', label: 'SD APPROVAL' },
  { type: 'procurement', label: 'PROCUREMENT' },
  { type: 'production', label: 'PRODUCTION' },
  { type: 'coating', label: 'COATING' },
  { type: 'dispatch', label: 'DISPATCH' },
  { type: 'erection', label: 'ERECTION' },
] as const;

type FilterTab = 'all' | 'in_progress' | 'blocked' | 'completed';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'completed', label: 'Completed' },
];

// --- Helper Functions ---

function getStatusColor(status: string, percentage: number): string {
  if (percentage === 100 || status === 'completed') return 'text-emerald-400';
  if (percentage > 0 || status === 'in_progress') return 'text-amber-400';
  return 'text-slate-500';
}

function getProgressBarColor(status: string, percentage: number): string {
  if (percentage === 100 || status === 'completed') return 'bg-emerald-500';
  if (percentage > 0 || status === 'in_progress') return 'bg-amber-500';
  return 'bg-slate-600';
}

function getProgressBarTrack(isDark: boolean): string {
  return isDark ? 'bg-slate-700/50' : 'bg-slate-200';
}

function getStatusIcon(status: string, percentage: number) {
  if (percentage === 100 || status === 'completed') {
    return <Check className="w-3.5 h-3.5 text-emerald-400" />;
  }
  if (percentage > 0 || status === 'in_progress') {
    return <Play className="w-3 h-3 text-amber-400 fill-amber-400" />;
  }
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function getPrimaryScope(scopes: ScopeData[]): ScopeData | null {
  const steelScope = scopes.find(
    (s) => s.scopeType.toLowerCase().includes('steel') || s.scopeType.toLowerCase() === 'main'
  );
  return steelScope || scopes[0] || null;
}

// --- Components ---

function StatusCell({
  activity,
  isDark,
}: {
  activity: { percentage: number; status: string } | null;
  isDark: boolean;
}) {
  const pct = activity?.percentage ?? 0;
  const status = activity?.status ?? 'not_started';

  return (
    <div
      className={`
        rounded-lg px-2.5 py-2 min-w-[90px] transition-colors
        ${isDark ? 'bg-[#1a2332] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}
      `}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {getStatusIcon(status, pct)}
        <span
          className={`text-sm font-semibold tabular-nums ${getStatusColor(status, pct)}`}
        >
          {pct}%
        </span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${getProgressBarTrack(isDark)}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressBarColor(status, pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OverallCell({
  progress,
  currentStage,
  isDark,
}: {
  progress: number;
  currentStage: { label: string; index: number } | null;
  isDark: boolean;
}) {
  const status = progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

  return (
    <div
      className={`
        rounded-lg px-3 py-2 min-w-[140px] transition-colors
        ${isDark ? 'bg-[#1a2332] border border-slate-700/50' : 'bg-white border border-slate-200 shadow-sm'}
      `}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {getStatusIcon(status, progress)}
        <span
          className={`text-sm font-bold tabular-nums ${getStatusColor(status, progress)}`}
        >
          {progress}%
        </span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden mb-1.5 ${getProgressBarTrack(isDark)}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressBarColor(status, progress)}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      {currentStage && (
        <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {'\u2192'} Stage {currentStage.index}: {currentStage.label}
        </p>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  colorClass,
  isDark,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  isDark: boolean;
}) {
  return (
    <Card
      className={`
        p-5 border transition-colors
        ${isDark ? 'bg-[#1a2332] border-slate-700/50' : 'bg-white border-slate-200'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {title}
        </span>
        <div className={`p-1.5 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </Card>
  );
}

function LoadingSkeleton({ isDark }: { isDark: boolean }) {
  const bg = isDark ? 'bg-slate-700' : '';
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card
            key={i}
            className={`p-5 ${isDark ? 'bg-[#1a2332] border-slate-700/50' : ''}`}
          >
            <Skeleton className={`h-4 w-24 mb-3 ${bg}`} />
            <Skeleton className={`h-9 w-16 ${bg}`} />
          </Card>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={`h-16 w-full rounded-lg ${bg}`} />
        ))}
      </div>
    </div>
  );
}

// --- Main Component ---

export default function ProjectTrackerClient() {
  const [data, setData] = useState<TrackerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/project-tracker?status=${activeTab}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json: TrackerResponse = await res.json();
      setData(json);
    } catch {
      // silently fail, keep stale data
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.projects;
    const q = searchQuery.toLowerCase();
    return data.projects.filter(
      (p) =>
        p.projectNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.buildings.some(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            (b.designation && b.designation.toLowerCase().includes(q))
        )
    );
  }, [data, searchQuery]);

  // Build flat rows grouped by project
  const rows = useMemo(() => {
    const result: {
      projectNumber: string;
      projectName: string;
      building: BuildingData;
      isFirstInProject: boolean;
      projectBuildingCount: number;
    }[] = [];

    for (const project of filteredProjects) {
      project.buildings.forEach((building, idx) => {
        result.push({
          projectNumber: project.projectNumber,
          projectName: project.name,
          building,
          isFirstInProject: idx === 0,
          projectBuildingCount: project.buildings.length,
        });
      });
    }
    return result;
  }, [filteredProjects]);

  const bgClass = isDark ? 'bg-[#0f1419]' : 'bg-slate-50';
  const textClass = isDark ? 'text-white' : 'text-slate-900';
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const headerBg = isDark ? 'bg-[#151d28]' : 'bg-slate-100';
  const rowHoverBg = isDark ? 'hover:bg-[#1e2d3d]' : 'hover:bg-slate-50';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgClass} ${textClass}`}>
      <div className="max-w-[1800px] mx-auto p-4 lg:p-6 space-y-5 max-lg:pt-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Project Status Tracker</h1>
            <p className={`text-sm ${mutedTextClass}`}>
              Real-time progress across all active projects
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsDark((prev) => !prev)}
            className={`
              rounded-lg transition-colors
              ${isDark ? 'border-slate-700 bg-[#1a2332] hover:bg-[#243044] text-slate-300' : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'}
            `}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        {loading && !data ? (
          <LoadingSkeleton isDark={isDark} />
        ) : data ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard
                title="Active Projects"
                value={data.stats.activeProjects}
                icon={<Activity className="w-4 h-4 text-emerald-400" />}
                colorClass="text-emerald-400"
                isDark={isDark}
              />
              <StatCard
                title="Total Buildings"
                value={data.stats.totalBuildings}
                icon={<Building2 className="w-4 h-4 text-blue-400" />}
                colorClass={isDark ? 'text-white' : 'text-slate-900'}
                isDark={isDark}
              />
              <StatCard
                title="In Progress"
                value={data.stats.inProgress}
                icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                colorClass="text-emerald-400"
                isDark={isDark}
              />
              <StatCard
                title="Completed"
                value={data.stats.completed}
                icon={<CheckCircle2 className="w-4 h-4 text-blue-400" />}
                colorClass={isDark ? 'text-white' : 'text-slate-900'}
                isDark={isDark}
              />
              <StatCard
                title="Blocked"
                value={data.stats.blocked}
                icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
                colorClass="text-red-400"
                isDark={isDark}
              />
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {FILTER_TABS.map((tab) => (
                  <Button
                    key={tab.key}
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      rounded-lg px-4 text-sm font-medium transition-colors
                      ${
                        activeTab === tab.key
                          ? isDark
                            ? 'bg-[#1a2332] text-white border border-slate-600'
                            : 'bg-white text-slate-900 border border-slate-300 shadow-sm'
                          : isDark
                            ? 'text-slate-400 hover:text-white hover:bg-[#1a2332]/60'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }
                    `}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-72">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedTextClass}`}
                />
                <Input
                  placeholder="Search project / building..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`
                    pl-9 h-9 rounded-lg text-sm
                    ${isDark ? 'bg-[#1a2332] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900'}
                  `}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className={mutedTextClass}>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className={mutedTextClass}>Active / In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className={mutedTextClass}>Not Started</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className={mutedTextClass}>Blocked</span>
              </div>
            </div>

            {/* Main Table */}
            <div
              className={`
                rounded-xl border overflow-hidden
                ${isDark ? 'border-slate-700/50' : 'border-slate-200'}
              `}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className={headerBg}>
                      <th
                        className={`
                          sticky left-0 z-10 text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-3
                          ${headerBg} ${mutedTextClass}
                        `}
                      >
                        Proj #
                      </th>
                      <th
                        className={`
                          sticky left-[100px] z-10 text-left text-[11px] font-semibold uppercase tracking-wider px-4 py-3
                          ${headerBg} ${mutedTextClass}
                        `}
                      >
                        Building
                      </th>
                      {ACTIVITY_COLUMNS.map((col) => (
                        <th
                          key={col.type}
                          className={`text-center text-[10px] font-semibold uppercase tracking-wider px-2 py-3 whitespace-nowrap ${mutedTextClass}`}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th
                        className={`text-center text-[10px] font-semibold uppercase tracking-wider px-2 py-3 ${mutedTextClass}`}
                      >
                        Overall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={ACTIVITY_COLUMNS.length + 3}
                          className={`text-center py-12 ${mutedTextClass}`}
                        >
                          No projects found
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, rowIdx) => {
                        const scope = getPrimaryScope(row.building.scopes);
                        const activityMap = new Map<string, ActivityData>();
                        if (scope) {
                          for (const act of scope.activities) {
                            activityMap.set(act.activityType, act);
                          }
                        }

                        return (
                          <tr
                            key={`${row.building.id}-${rowIdx}`}
                            className={`
                              border-t transition-colors
                              ${isDark ? 'border-slate-800' : 'border-slate-100'}
                              ${rowHoverBg}
                            `}
                          >
                            {/* Project Number */}
                            <td
                              className={`
                                sticky left-0 z-10 px-4 py-2.5 text-sm font-semibold align-top whitespace-nowrap
                                ${isDark ? 'bg-[#0f1419]' : 'bg-slate-50'}
                              `}
                            >
                              {row.isFirstInProject ? (
                                <div>
                                  <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                                    {row.projectNumber}
                                  </span>
                                  <p
                                    className={`text-[10px] font-normal truncate max-w-[90px] ${mutedTextClass}`}
                                  >
                                    {row.projectName}
                                  </p>
                                </div>
                              ) : null}
                            </td>

                            {/* Building Name */}
                            <td
                              className={`
                                sticky left-[100px] z-10 px-4 py-2.5 text-sm align-top whitespace-nowrap
                                ${isDark ? 'bg-[#0f1419]' : 'bg-slate-50'}
                              `}
                            >
                              <span className="font-medium">
                                {row.building.designation || row.building.name}
                              </span>
                              {row.building.weight && (
                                <p className={`text-[10px] ${mutedTextClass}`}>
                                  {Number(row.building.weight).toLocaleString()} T
                                </p>
                              )}
                            </td>

                            {/* Activity Columns */}
                            {ACTIVITY_COLUMNS.map((col) => {
                              const act = activityMap.get(col.type);
                              return (
                                <td key={col.type} className="px-1.5 py-2">
                                  <StatusCell
                                    activity={
                                      act
                                        ? { percentage: act.percentage, status: act.status }
                                        : null
                                    }
                                    isDark={isDark}
                                  />
                                </td>
                              );
                            })}

                            {/* Overall */}
                            <td className="px-1.5 py-2">
                              <OverallCell
                                progress={row.building.overallProgress}
                                currentStage={row.building.currentStage}
                                isDark={isDark}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className={`text-center py-20 ${mutedTextClass}`}>
            Failed to load data. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
