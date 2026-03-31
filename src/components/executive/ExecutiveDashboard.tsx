'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandMetrics } from '@/components/executive/CommandMetrics';
import { ProjectHealthMatrix } from '@/components/executive/ProjectHealthMatrix';
import { CashFlowSnapshot } from '@/components/executive/CashFlowSnapshot';
import { ProductionPulse } from '@/components/executive/ProductionPulse';
import { DecisionsRequired } from '@/components/executive/DecisionsRequired';

const REFRESH_INTERVAL = 60;

interface SummaryData {
  activeProjects: { count: number; buildings: number; tonnes: number; trend: number };
  productionVelocity: { tonnesThisMonth: number; monthlyTarget: number; percentage: number; trend: number };
  collectionRate: { percentage: number; pendingSAR: number; trend: number };
  procurementExposure: { count: number; estimatedValue: number; trend: number };
  openRiskFlags: { count: number; critical: number; warnings: number; trend: number };
}

interface ProjectHealthRow {
  projectId: string;
  projectNumber: string;
  name: string;
  clientName: string;
  deadline: string | null;
  daysRemaining: number | null;
  engineeringPct: number | null;
  productionPct: number;
  procurementOverdue: number;
  collectionPct: number | null;
  riskCount: number;
  ragStatus: 'green' | 'amber' | 'red';
}

interface DecisionItem {
  id: string;
  category: string;
  description: string;
  projectRef: string | null;
  daysOverdue: number;
  actionLink: string;
  urgency: 'critical' | 'high' | 'medium';
}

interface CashflowData {
  thisMonth: { cashIn: number; cashOut: number; net: number };
  next30Days: { projectedIn: number; projectedOut: number; netPosition: number };
  weeklyTrend: { week: string; tonnes: number }[];
  topProjectsThisWeek: { projectId: string; projectNumber: string; name: string; tonnesThisWeek: number }[];
}

type FetchStatus = 'loading' | 'ok' | 'error';

function SectionCard({
  title,
  children,
  status,
  lastUpdated,
  className,
}: {
  title: string;
  children: React.ReactNode;
  status: FetchStatus;
  lastUpdated: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide">{title}</h2>
        {status === 'error' && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="size-3.5" />
            <span>Data unavailable</span>
          </div>
        )}
        {status === 'loading' && (
          <RefreshCw className="size-3.5 text-slate-500 animate-spin" />
        )}
        {status === 'ok' && lastUpdated && (
          <span className="text-xs text-slate-600">
            {new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className="p-5">
        {status === 'error' ? (
          <p className="text-xs text-slate-500 italic">
            Data unavailable — last synced{' '}
            {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'unknown'}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function CountdownRing({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsLeft / total;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative size-9 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="36" height="36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#1e293b" strokeWidth="2.5" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="text-[10px] font-mono text-slate-400 z-10">{secondsLeft}s</span>
    </div>
  );
}

export function ExecutiveDashboard() {
  const [summaryStatus, setSummaryStatus] = useState<FetchStatus>('loading');
  const [healthStatus, setHealthStatus] = useState<FetchStatus>('loading');
  const [decisionsStatus, setDecisionsStatus] = useState<FetchStatus>('loading');
  const [cashflowStatus, setCashflowStatus] = useState<FetchStatus>('loading');

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [healthRows, setHealthRows] = useState<ProjectHealthRow[]>([]);
  const [decisionItems, setDecisionItems] = useState<DecisionItem[]>([]);
  const [cashflowData, setCashflowData] = useState<CashflowData | null>(null);

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);

    const [summaryRes, healthRes, decisionsRes, cashflowRes] = await Promise.allSettled([
      fetch('/api/executive/summary'),
      fetch('/api/executive/project-health'),
      fetch('/api/executive/decisions-required'),
      fetch('/api/executive/cashflow-snapshot'),
    ]);

    if (summaryRes.status === 'fulfilled' && summaryRes.value.ok) {
      const json = await summaryRes.value.json();
      setSummaryData(json.data);
      setSummaryStatus('ok');
    } else {
      setSummaryStatus('error');
    }

    if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
      const json = await healthRes.value.json();
      setHealthRows(json.data ?? []);
      setHealthStatus('ok');
    } else {
      setHealthStatus('error');
    }

    if (decisionsRes.status === 'fulfilled' && decisionsRes.value.ok) {
      const json = await decisionsRes.value.json();
      setDecisionItems(json.data ?? []);
      setDecisionsStatus('ok');
    } else {
      setDecisionsStatus('error');
    }

    if (cashflowRes.status === 'fulfilled' && cashflowRes.value.ok) {
      const json = await cashflowRes.value.json();
      setCashflowData(json.data);
      setCashflowStatus('ok');
    } else {
      setCashflowStatus('error');
    }

    setLastUpdated(new Date().toISOString());
    setCountdown(REFRESH_INTERVAL);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchAll();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full p-4 lg:p-6 space-y-5 max-lg:pt-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white">
              OTS™ Executive Command Center
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time operational intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="size-3.5" />
                <span>
                  Updated {new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            <CountdownRing secondsLeft={countdown} total={REFRESH_INTERVAL} />
            <button
              onClick={fetchAll}
              disabled={isRefreshing}
              className={cn(
                'p-1.5 rounded-lg border border-slate-700 text-slate-400',
                'hover:border-slate-600 hover:text-slate-300 transition-colors',
                isRefreshing && 'opacity-50 cursor-not-allowed',
              )}
              aria-label="Refresh data"
            >
              <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* ── Five Command Metrics ─────────────────────────────────────────── */}
        {summaryStatus === 'loading' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : summaryStatus === 'error' || !summaryData ? (
          <div className="rounded-xl border border-red-800/50 bg-red-900/10 p-4 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            Command metrics unavailable — data could not be loaded
          </div>
        ) : (
          <CommandMetrics data={summaryData} />
        )}

        {/* ── Project Health Matrix ────────────────────────────────────────── */}
        <SectionCard
          title="Project Health Matrix"
          status={healthStatus}
          lastUpdated={lastUpdated}
        >
          <ProjectHealthMatrix rows={healthRows} />
        </SectionCard>

        {/* ── Bottom row: 3-column grid ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Cash Flow Snapshot */}
          <SectionCard
            title="Cash Flow Snapshot"
            status={cashflowStatus}
            lastUpdated={lastUpdated}
          >
            {cashflowData ? (
              <CashFlowSnapshot data={cashflowData} />
            ) : (
              <div className="h-40 rounded-lg bg-slate-800/30 animate-pulse" />
            )}
          </SectionCard>

          {/* Production Pulse */}
          <SectionCard
            title="Production Pulse"
            status={cashflowStatus}
            lastUpdated={lastUpdated}
          >
            {cashflowData ? (
              <ProductionPulse data={cashflowData} />
            ) : (
              <div className="h-40 rounded-lg bg-slate-800/30 animate-pulse" />
            )}
          </SectionCard>

          {/* Decisions Required */}
          <SectionCard
            title={`Decisions Required${decisionItems.length > 0 ? ` (${decisionItems.length})` : ''}`}
            status={decisionsStatus}
            lastUpdated={lastUpdated}
          >
            <DecisionsRequired items={decisionItems} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
