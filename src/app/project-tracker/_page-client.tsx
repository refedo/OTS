'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  X,
  Clock,
  Package,
  Weight,
  FileText,
  HelpCircle,
  ChevronDown,
  Pin,
} from 'lucide-react';

// --- Types ---

interface TaskDetail {
  id: string;
  title: string;
  subActivity: string | null;
  revision: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  consultantResponseCode: string | null;
  assignedTo: string | null;
  isOverdue: boolean;
}

interface ProcurementDetail {
  totalEntries: number;
  totalWeight: number;
  boughtWeight: number;
  underRequestWeight: number;
  availableWeight: number;
}

interface ProductionDetail {
  totalWeight: number;
  dispatchedWeight: number;
  shipmentCount?: number;
  processes: { name: string; processedWeight: number; percentage: number }[];
}

interface ActivityDetails {
  tasks?: TaskDetail[];
  procurement?: ProcurementDetail;
  production?: ProductionDetail;
}

interface ActivityData {
  id: string;
  activityType: string;
  activityLabel: string;
  percentage: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'pending_approval'
    | 'pending' | 'waiting_approval' | 'completed_released' | 'rejected' | 'approved';
  consultantCode?: string;
  details: ActivityDetails;
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
  assemblyTonnage: number;
  scopes: ScopeData[];
  overallProgress: number;
  hasBlocked: boolean;
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
  { type: 'arch_approval', label: 'ARCH DRAWING',  color: 'text-sky-400' },
  { type: 'design',        label: 'DESIGN STAGE',  color: 'text-violet-400' },
  { type: 'detailing',     label: 'SHOP DRAWINGS', color: 'text-cyan-400' },
  { type: 'procurement',   label: 'PROCUREMENT',   color: 'text-amber-400' },
  { type: 'production',    label: 'PRODUCTION',    color: 'text-orange-400' },
  { type: 'coating',       label: 'COATING',       color: 'text-pink-400' },
  { type: 'dispatch',      label: 'DISPATCH',      color: 'text-lime-400' },
  { type: 'erection',      label: 'ERECTION',      color: 'text-emerald-400' },
] as const;

const DESIGN_REVISION_TYPES = new Set(['design', 'detailing']);

type FilterTab = 'all' | 'in_progress' | 'blocked' | 'completed';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'completed', label: 'Completed' },
];

const CONSULTANT_CODES: Record<string, { label: string; color: string }> = {
  code_a: { label: 'A - Approved', color: 'text-emerald-400' },
  code_b: { label: 'B - Approved w/ Comments', color: 'text-amber-400' },
  code_c: { label: 'C - Resubmit', color: 'text-red-400' },
};

// --- Helper Functions ---

function getStatusColor(status: string, percentage: number, isDesignRevision = false): string {
  if (status === 'approved') return 'text-emerald-400';
  if (status === 'rejected') return 'text-red-400';
  if (status === 'completed_released') return 'text-teal-400';
  if (status === 'completed' && isDesignRevision) return 'text-green-400';
  if (status === 'waiting_approval') return 'text-purple-400';
  if (status === 'pending') return 'text-orange-400';
  if (status === 'in_progress' && isDesignRevision) return 'text-blue-400';
  if (status === 'blocked') return 'text-red-400';
  if (status === 'pending_approval') return 'text-blue-400';
  if (percentage === 100 || status === 'completed') return 'text-emerald-400';
  if (percentage > 0 || status === 'in_progress') return 'text-amber-400';
  return 'text-slate-500';
}

function getProgressBarColor(status: string, percentage: number, isDesignRevision = false): string {
  if (status === 'approved') return 'bg-emerald-500';
  if (status === 'rejected') return 'bg-red-500';
  if (status === 'completed_released') return 'bg-teal-500';
  if (status === 'completed' && isDesignRevision) return 'bg-green-500';
  if (status === 'waiting_approval') return 'bg-purple-500';
  if (status === 'pending') return 'bg-orange-500';
  if (status === 'in_progress' && isDesignRevision) return 'bg-blue-500';
  if (status === 'blocked') return 'bg-red-500';
  if (status === 'pending_approval') return 'bg-blue-500';
  if (percentage === 100 || status === 'completed') return 'bg-emerald-500';
  if (percentage > 0 || status === 'in_progress') return 'bg-amber-500';
  return 'bg-slate-600';
}

function getProgressBarTrack(isDark: boolean): string {
  return isDark ? 'bg-slate-700/50' : 'bg-slate-200';
}

function getStatusIcon(status: string, percentage: number, isDesignRevision = false) {
  if (status === 'approved') return <Check className="w-3.5 h-3.5 text-emerald-400" />;
  if (status === 'rejected') return <X className="w-3.5 h-3.5 text-red-400" />;
  if (status === 'completed_released') return <Check className="w-3.5 h-3.5 text-teal-400" />;
  if (status === 'completed' && isDesignRevision) return <Check className="w-3.5 h-3.5 text-green-400" />;
  if (status === 'waiting_approval') return <Clock className="w-3.5 h-3.5 text-purple-400" />;
  if (status === 'pending') return <Minus className="w-3.5 h-3.5 text-orange-400" />;
  if (status === 'in_progress' && isDesignRevision) return <Play className="w-3 h-3 text-blue-400 fill-blue-400" />;
  if (status === 'blocked') return <X className="w-3.5 h-3.5 text-red-400" />;
  if (status === 'pending_approval') return <Clock className="w-3.5 h-3.5 text-blue-400" />;
  if (percentage === 100 || status === 'completed') return <Check className="w-3.5 h-3.5 text-emerald-400" />;
  if (percentage > 0 || status === 'in_progress') return <Play className="w-3 h-3 text-amber-400 fill-amber-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function getBorderColor(status: string, isDark: boolean): string {
  if (status === 'approved') return isDark ? 'border-emerald-500/40' : 'border-emerald-300';
  if (status === 'rejected') return 'border-red-500/60';
  if (status === 'completed_released') return isDark ? 'border-teal-500/40' : 'border-teal-300';
  if (status === 'completed') return isDark ? 'border-green-500/40' : 'border-green-300';
  if (status === 'waiting_approval') return isDark ? 'border-purple-500/40' : 'border-purple-300';
  if (status === 'pending') return isDark ? 'border-orange-500/40' : 'border-orange-300';
  if (status === 'in_progress') return isDark ? 'border-blue-500/30' : 'border-blue-200';
  if (status === 'blocked') return 'border-red-500/60';
  if (status === 'pending_approval') return isDark ? 'border-blue-500/40' : 'border-blue-300';
  if (status === 'completed') return isDark ? 'border-emerald-500/40' : 'border-emerald-300';
  return isDark ? 'border-slate-700/50' : 'border-slate-200';
}

function getPrimaryScope(scopes: ScopeData[]): ScopeData | null {
  const steelScope = scopes.find(
    (s) => s.scopeType.toLowerCase().includes('steel') || s.scopeType.toLowerCase() === 'main'
  );
  return steelScope || scopes[0] || null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatWeight(w: number): string {
  if (w >= 1000) return `${(w / 1000).toFixed(1)} T`;
  return `${w.toFixed(0)} kg`;
}

// --- Components ---

function DetailPopover({
  activity,
  isDark,
  onClose,
}: {
  activity: ActivityData;
  isDark: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const bg = isDark ? 'bg-[#1a2332]' : 'bg-white';
  const border = isDark ? 'border-slate-600' : 'border-slate-300';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const text = isDark ? 'text-white' : 'text-slate-900';

  return (
    <div
      ref={ref}
      className={`absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-72 rounded-lg border shadow-xl ${bg} ${border} ${text} p-3 text-xs`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{activity.activityLabel}</span>
        <button onClick={onClose} className={`p-0.5 rounded hover:bg-slate-700/50 ${muted}`}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Task details */}
      {activity.details.tasks && activity.details.tasks.length > 0 && (
        <div className="space-y-2">
          {activity.details.tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-md p-2 border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <a
                  href={`/tasks/${task.id}`}
                  className="font-medium truncate hover:underline text-blue-400"
                  onClick={(e) => e.stopPropagation()}
                >
                  {task.title}
                </a>
                {task.isOverdue && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400">
                    OVERDUE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5">
                <div className={muted}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  Due: {formatDate(task.dueDate)}
                </div>
                <div className={muted}>
                  <Check className="w-3 h-3 inline mr-1" />
                  Done: {formatDate(task.completedAt)}
                </div>
                {task.approvedAt && (
                  <div className={muted}>
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    Approved: {formatDate(task.approvedAt)}
                  </div>
                )}
                {task.rejectedAt && (
                  <div className="text-red-400">
                    <X className="w-3 h-3 inline mr-1" />
                    Rejected: {formatDate(task.rejectedAt)}
                  </div>
                )}
                {task.revision && (
                  <div className={muted}>
                    <FileText className="w-3 h-3 inline mr-1" />
                    Rev: {task.revision}
                  </div>
                )}
                {task.consultantResponseCode && (
                  <div className={`col-span-2 ${CONSULTANT_CODES[task.consultantResponseCode]?.color || muted}`}>
                    Code: {CONSULTANT_CODES[task.consultantResponseCode]?.label || task.consultantResponseCode}
                  </div>
                )}
                {task.assignedTo && (
                  <div className={`col-span-2 ${muted}`}>
                    Assigned: {task.assignedTo}
                  </div>
                )}
              </div>
              <div className="mt-1">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    task.status === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : task.status === 'In Progress'
                        ? 'bg-blue-500/20 text-blue-400'
                        : task.status === 'Waiting for Approval'
                          ? 'bg-purple-500/20 text-purple-400'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Procurement details */}
      {activity.details.procurement && (
        <div className={`rounded-md p-2 border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div className={muted}>
              <Package className="w-3 h-3 inline mr-1" />
              Entries: {activity.details.procurement.totalEntries}
            </div>
            <div className={muted}>
              <Weight className="w-3 h-3 inline mr-1" />
              Total: {formatWeight(activity.details.procurement.totalWeight)}
            </div>
            <div className="text-emerald-400">
              Bought: {formatWeight(activity.details.procurement.boughtWeight)}
            </div>
            <div className="text-amber-400">
              Under Request: {formatWeight(activity.details.procurement.underRequestWeight)}
            </div>
            <div className="text-blue-400 col-span-2">
              Available: {formatWeight(activity.details.procurement.availableWeight)}
            </div>
          </div>
        </div>
      )}

      {/* Production details */}
      {activity.details.production && (
        <div className={`rounded-md p-2 border ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
          {activity.activityType === 'dispatch' ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className={muted}>
                  <Weight className="w-3 h-3 inline mr-1" />
                  Scope Weight
                </span>
                <span className={`tabular-nums font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {formatWeight(activity.details.production.totalWeight)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={muted}>
                  <Weight className="w-3 h-3 inline mr-1" />
                  Dispatched to Customer
                </span>
                <span className={`tabular-nums font-semibold ${activity.details.production.dispatchedWeight > 0 ? 'text-emerald-400' : muted}`}>
                  {formatWeight(activity.details.production.dispatchedWeight)}
                </span>
              </div>
              {activity.details.production.shipmentCount !== undefined && (
                <div className="flex items-center justify-between">
                  <span className={muted}>Shipments</span>
                  <span className={`tabular-nums font-medium ${activity.details.production.shipmentCount > 0 ? (isDark ? 'text-slate-300' : 'text-slate-700') : muted}`}>
                    {activity.details.production.shipmentCount}
                  </span>
                </div>
              )}
              {activity.details.production.totalWeight > 0 && (
                <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${Math.min(Math.round((activity.details.production.dispatchedWeight / activity.details.production.totalWeight) * 100), 100)}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={`mb-1.5 ${muted}`}>
                <Weight className="w-3 h-3 inline mr-1" />
                Total Weight: {formatWeight(activity.details.production.totalWeight)}
              </div>
              <div className="space-y-1">
                {activity.details.production.processes.map((p) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <span className={muted}>{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`tabular-nums ${p.percentage > 0 ? 'text-amber-400' : muted}`}>
                        {formatWeight(p.processedWeight)}
                      </span>
                      <span className={`tabular-nums font-medium w-10 text-right ${p.percentage >= 100 ? 'text-emerald-400' : p.percentage > 0 ? 'text-amber-400' : muted}`}>
                        {p.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* No data */}
      {!activity.details.tasks && !activity.details.procurement && !activity.details.production && (
        <p className={muted}>No data available</p>
      )}
    </div>
  );
}

function StatusCell({
  activity,
  isDark,
}: {
  activity: ActivityData | null;
  isDark: boolean;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const pct = activity?.percentage ?? 0;
  const status = activity?.status ?? 'not_started';
  const isDesignRevision = DESIGN_REVISION_TYPES.has(activity?.activityType ?? '');
  const hasDetails = activity?.details && (
    activity.details.tasks?.length ||
    activity.details.procurement ||
    activity.details.production
  );
  const isPending = status === 'pending';

  return (
    <div className="relative">
      <div
        onClick={() => hasDetails && setShowDetail((v) => !v)}
        className={`
          relative rounded-lg px-2.5 py-2 min-w-[90px] transition-colors
          ${hasDetails ? 'cursor-pointer' : ''}
          ${isDark ? 'bg-[#1a2332]' : 'bg-white shadow-sm'}
          border ${getBorderColor(status, isDark)}
        `}
      >
        {/* Consultant code badge (upper-right corner, approved state only) */}
        {status === 'approved' && activity?.consultantCode && (
          <span className={`absolute top-0.5 right-1 text-[9px] font-bold leading-none ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            {activity.consultantCode}
          </span>
        )}
        <div className="flex items-center gap-1.5 mb-1.5">
          {getStatusIcon(status, pct, isDesignRevision)}
          <span className={`text-sm font-semibold tabular-nums ${getStatusColor(status, pct, isDesignRevision)}`}>
            {isPending ? 'P' : `${pct}%`}
          </span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${getProgressBarTrack(isDark)}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${getProgressBarColor(status, pct, isDesignRevision)}`}
            style={{ width: `${Math.max(pct, status === 'blocked' ? 100 : 0)}%` }}
          />
        </div>
      </div>
      {showDetail && activity && (
        <DetailPopover
          activity={activity}
          isDark={isDark}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}

function OverallCell({
  progress,
  currentStage,
  hasBlocked,
  isDark,
}: {
  progress: number;
  currentStage: { label: string; index: number } | null;
  hasBlocked: boolean;
  isDark: boolean;
}) {
  const status = hasBlocked ? 'blocked' : progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';

  return (
    <div
      className={`
        rounded-lg px-3 py-2 min-w-[140px] transition-colors
        ${isDark ? 'bg-[#1a2332]' : 'bg-white shadow-sm'}
        border ${getBorderColor(status, isDark)}
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
          <Card key={i} className={`p-5 ${isDark ? 'bg-[#1a2332] border-slate-700/50' : ''}`}>
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

// --- Calculation Legend ---

function CalculationLegend({ isDark, mutedTextClass }: { isDark: boolean; mutedTextClass: string }) {
  const [open, setOpen] = useState(false);
  const borderClass = isDark ? 'border-slate-700/60' : 'border-slate-200';
  const bgClass = isDark ? 'bg-slate-800/60' : 'bg-slate-50';
  const textClass = isDark ? 'text-slate-200' : 'text-slate-700';

  return (
    <div className={`rounded-lg border text-xs ${borderClass} ${bgClass}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 ${mutedTextClass} hover:opacity-80 transition-opacity`}
      >
        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
        <span>How are percentages calculated?</span>
        <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`px-4 pb-4 pt-1 space-y-3 border-t ${borderClass}`}>
          <div className="space-y-1.5">
            <p className={`font-semibold text-[11px] uppercase tracking-wide ${mutedTextClass}`}>
              Design Stage &amp; Shop Drawings
            </p>
            <p className={`${textClass} leading-relaxed`}>
              Progress is driven by the latest revision status of each task.
            </p>
            <div className={`grid grid-cols-2 gap-x-4 gap-y-0.5 ${mutedTextClass} pl-2`}>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />Pending</span>
              <span className="text-orange-400 font-medium">P (orange)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />In Progress</span>
              <span className="text-blue-400 font-medium">50% — blue</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />Waiting for Approval</span>
              <span className="text-purple-400 font-medium">50% — purple</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />Completed</span>
              <span className="text-green-400 font-medium">70% — pale green</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />Completed &amp; Released</span>
              <span className="text-teal-400 font-medium">80% — teal</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />Rejected</span>
              <span className="text-red-400 font-medium">50% — red</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />Approved</span>
              <span className="text-emerald-400 font-medium">100% — green + code (A/B/C)</span>
            </div>
            <p className={`${mutedTextClass} italic text-[10px]`}>
              Cell shows the worst state across all tasks for that building. Consultant code (A/B/C) appears in the upper-right corner when all tasks are approved.
            </p>
          </div>

          <div className="space-y-1.5">
            <p className={`font-semibold text-[11px] uppercase tracking-wide ${mutedTextClass}`}>
              Arch Drawing (approval-led)
            </p>
            <p className={`${textClass} leading-relaxed`}>
              Progress driven by consultant approval on tasks.
            </p>
            <div className={`grid grid-cols-2 gap-x-4 gap-y-0.5 ${mutedTextClass} pl-2`}>
              <span>Fully approved by consultant</span><span className="text-emerald-500 font-medium">100%</span>
              <span>Submitted / completed (awaiting)</span><span className="text-amber-500 font-medium">75%</span>
              <span>In Progress</span><span className="font-medium">40%</span>
              <span>Open / Pending</span><span className="font-medium">15%</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className={`font-semibold text-[11px] uppercase tracking-wide ${mutedTextClass}`}>Other columns</p>
            <div className={`${mutedTextClass} space-y-0.5 pl-2`}>
              <p><strong className={textClass}>Procurement</strong> — weight-based: (bought + available) ÷ total LCR weight</p>
              <p><strong className={textClass}>Production</strong> — actual processed weight ÷ total scope weight</p>
              <p><strong className={textClass}>Coating, Dispatch, Erection</strong> — production log weight ÷ total scope weight</p>
              <p><strong className={textClass}>Overall</strong> — simple average of all activity percentages for the building</p>
            </div>
          </div>

          <p className={`${mutedTextClass} italic`}>
            When any task is overdue the column is marked Blocked.
          </p>
        </div>
      )}
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
  const [freezeHeader, setFreezeHeader] = useState(false);

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setFreezeHeader((prev) => !prev)}
              title={freezeHeader ? 'Unfreeze header row' : 'Freeze header row'}
              className={`
                rounded-lg transition-colors
                ${
                  freezeHeader
                    ? isDark
                      ? 'border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'border-amber-400 bg-amber-50 text-amber-600 hover:bg-amber-100'
                    : isDark
                      ? 'border-slate-700 bg-[#1a2332] hover:bg-[#243044] text-slate-300'
                      : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                }
              `}
            >
              <Pin className={`w-4 h-4 ${freezeHeader ? 'fill-current' : ''}`} />
            </Button>
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
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className={mutedTextClass}>Approved (100%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span className={mutedTextClass}>Completed &amp; Released (80%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className={mutedTextClass}>Completed (70%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className={mutedTextClass}>Waiting for Approval (50%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className={mutedTextClass}>In Progress (50%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className={mutedTextClass}>Rejected (50%) / Blocked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full border-2 ${isDark ? 'border-orange-400 bg-transparent' : 'border-orange-400 bg-orange-100'}`} />
                  <span className={mutedTextClass}>Pending (P)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                  <span className={mutedTextClass}>Not Started</span>
                </div>
              </div>
              <CalculationLegend isDark={isDark} mutedTextClass={mutedTextClass} />
            </div>

            {/* Main Table */}
            <div
              className={`
                rounded-xl border overflow-hidden
                ${isDark ? 'border-slate-700/50' : 'border-slate-200'}
              `}
            >
              <div className={freezeHeader ? 'overflow-auto max-h-[calc(100vh-300px)]' : 'overflow-x-auto'}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className={`${headerBg} ${freezeHeader ? 'sticky top-0 z-30' : ''}`}>
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
                      <th
                        className={`text-center text-[11px] font-semibold uppercase tracking-wider px-3 py-3 whitespace-nowrap ${mutedTextClass}`}
                      >
                        Tonnage
                      </th>
                      {ACTIVITY_COLUMNS.map((col) => (
                        <th
                          key={col.type}
                          className={`text-center text-[10px] font-semibold uppercase tracking-wider px-2 py-3 whitespace-nowrap ${col.color}`}
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
                          colSpan={ACTIVITY_COLUMNS.length + 4}
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

                            <td
                              className={`
                                sticky left-[100px] z-10 px-4 py-2.5 text-sm align-top whitespace-nowrap
                                ${isDark ? 'bg-[#0f1419]' : 'bg-slate-50'}
                              `}
                            >
                              <span className="font-medium">
                                {row.building.name || row.building.designation}
                              </span>
                            </td>

                            <td className={`px-3 py-2.5 text-center text-sm align-top whitespace-nowrap ${mutedTextClass}`}>
                              {row.building.assemblyTonnage > 0
                                ? <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.building.assemblyTonnage.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} T</span>
                                : row.building.weight
                                  ? <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{Number(row.building.weight).toLocaleString()} T</span>
                                  : <span>—</span>
                              }
                            </td>

                            {ACTIVITY_COLUMNS.map((col) => {
                              const act = activityMap.get(col.type) ?? null;
                              return (
                                <td key={col.type} className="px-1.5 py-2">
                                  <StatusCell activity={act} isDark={isDark} />
                                </td>
                              );
                            })}

                            <td className="px-1.5 py-2">
                              <OverallCell
                                progress={row.building.overallProgress}
                                currentStage={row.building.currentStage}
                                hasBlocked={row.building.hasBlocked}
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
