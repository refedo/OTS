'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Clock, AlertCircle, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandMetrics } from '@/components/executive/CommandMetrics';
import { ProjectHealthMatrix } from '@/components/executive/ProjectHealthMatrix';
import { CashFlowSnapshot } from '@/components/executive/CashFlowSnapshot';
import { ProductionPulse } from '@/components/executive/ProductionPulse';
import { DecisionsRequired } from '@/components/executive/DecisionsRequired';
import Link from 'next/link';

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

interface APAgingData {
  buckets: { current: number; days1to30: number; days31to60: number; days61to90: number; days90plus: number; total: number };
  rows: Array<{ thirdpartyName: string; invoiceCount: number; current: number; days1to30: number; days31to60: number; days61to90: number; days90plus: number; total: number }>;
}

type FetchStatus = 'loading' | 'ok' | 'error';

function formatSAR(n: number): string {
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `SAR ${(n / 1_000).toFixed(0)}K`;
  return `SAR ${n.toLocaleString()}`;
}

function APAgingWidget({ data, isDark }: { data: APAgingData; isDark: boolean }) {
  const rowBg = isDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50';
  const borderCls = isDark ? 'border-slate-700/50' : 'border-gray-100';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const textMain = isDark ? 'text-slate-200' : 'text-gray-800';
  const { buckets, rows } = data;

  const bucketItems = [
    { label: 'Current', value: buckets.current, color: 'text-green-400' },
    { label: '1-30 Days', value: buckets.days1to30, color: 'text-yellow-400' },
    { label: '31-60 Days', value: buckets.days31to60, color: 'text-orange-400' },
    { label: '61-90 Days', value: buckets.days61to90, color: 'text-red-400' },
    { label: '90+ Days', value: buckets.days90plus, color: 'text-red-600' },
    { label: 'Total', value: buckets.total, color: isDark ? 'text-white' : 'text-gray-900' },
  ];

  return (
    <div className="space-y-4">
      {/* Summary buckets */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {bucketItems.map(b => (
          <div key={b.label} className={cn('rounded-lg p-2.5', isDark ? 'bg-slate-800/40' : 'bg-gray-50')}>
            <div className={cn('text-[10px]', textMuted)}>{b.label}</div>
            <div className={cn('text-sm font-bold mt-0.5 tabular-nums', b.color)}>{formatSAR(b.value)}</div>
          </div>
        ))}
      </div>

      {/* Supplier table */}
      {rows.length === 0 ? (
        <p className={cn('text-xs text-center py-2', textMuted)}>No outstanding payables.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={cn('border-b', borderCls)}>
                <th className={cn('text-left py-1.5 pr-3 font-medium', textMuted)}>Third Party</th>
                <th className={cn('text-right py-1.5 pr-2 font-medium', textMuted)}>Current</th>
                <th className={cn('text-right py-1.5 pr-2 font-medium', textMuted)}>1-30</th>
                <th className={cn('text-right py-1.5 pr-2 font-medium', textMuted)}>31-60</th>
                <th className={cn('text-right py-1.5 pr-2 font-medium', textMuted)}>61-90</th>
                <th className={cn('text-right py-1.5 pr-2 font-medium', textMuted)}>90+</th>
                <th className={cn('text-right py-1.5 font-medium', textMuted)}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r, i) => (
                <tr key={i} className={cn('border-b transition-colors', borderCls, rowBg)}>
                  <td className={cn('py-1.5 pr-3 truncate max-w-[160px]', textMain)}>
                    {r.thirdpartyName}
                    <span className={cn('ml-1 text-[10px]', textMuted)}>{r.invoiceCount}</span>
                  </td>
                  <td className={cn('py-1.5 pr-2 text-right tabular-nums', r.current > 0 ? 'text-green-400' : textMuted)}>{r.current > 0 ? formatSAR(r.current) : '—'}</td>
                  <td className={cn('py-1.5 pr-2 text-right tabular-nums', r.days1to30 > 0 ? 'text-yellow-400' : textMuted)}>{r.days1to30 > 0 ? formatSAR(r.days1to30) : '—'}</td>
                  <td className={cn('py-1.5 pr-2 text-right tabular-nums', r.days31to60 > 0 ? 'text-orange-400' : textMuted)}>{r.days31to60 > 0 ? formatSAR(r.days31to60) : '—'}</td>
                  <td className={cn('py-1.5 pr-2 text-right tabular-nums', r.days61to90 > 0 ? 'text-red-400' : textMuted)}>{r.days61to90 > 0 ? formatSAR(r.days61to90) : '—'}</td>
                  <td className={cn('py-1.5 pr-2 text-right tabular-nums', r.days90plus > 0 ? 'text-red-600' : textMuted)}>{r.days90plus > 0 ? formatSAR(r.days90plus) : '—'}</td>
                  <td className={cn('py-1.5 text-right tabular-nums font-medium', textMain)}>{formatSAR(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && (
            <p className={cn('text-xs mt-2 text-center', textMuted)}>
              Showing top 10 of {rows.length} suppliers.{' '}
              <Link href="/financial/reports/aging?type=payable" className="underline hover:opacity-80">View full report</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
  status,
  lastUpdated,
  className,
  isDark = true,
}: {
  title: string;
  children: React.ReactNode;
  status: FetchStatus;
  lastUpdated: string | null;
  className?: string;
  isDark?: boolean;
}) {
  const cardCls = isDark
    ? 'border-slate-800 bg-slate-900/60'
    : 'border-gray-200 bg-white';
  const titleCls = isDark ? 'text-slate-200' : 'text-gray-800';
  const borderCls = isDark ? 'border-slate-800' : 'border-gray-200';
  const timestampCls = isDark ? 'text-slate-600' : 'text-gray-400';
  const errorBodyCls = isDark ? 'text-slate-500' : 'text-gray-400';

  return (
    <div className={cn('rounded-xl border backdrop-blur-sm overflow-hidden', cardCls, className)}>
      <div className={cn('flex items-center justify-between px-5 py-3 border-b', borderCls)}>
        <h2 className={cn('text-sm font-semibold tracking-wide', titleCls)}>{title}</h2>
        {status === 'error' && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="size-3.5" />
            <span>Data unavailable</span>
          </div>
        )}
        {status === 'loading' && (
          <RefreshCw className={cn('size-3.5 animate-spin', isDark ? 'text-slate-500' : 'text-gray-400')} />
        )}
        {status === 'ok' && lastUpdated && (
          <span className={cn('text-xs', timestampCls)}>
            {new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <div className="p-5">
        {status === 'error' ? (
          <p className={cn('text-xs italic', errorBodyCls)}>
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
  const [apAgingStatus, setApAgingStatus] = useState<FetchStatus>('loading');

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [healthRows, setHealthRows] = useState<ProjectHealthRow[]>([]);
  const [decisionItems, setDecisionItems] = useState<DecisionItem[]>([]);
  const [cashflowData, setCashflowData] = useState<CashflowData | null>(null);
  const [apAgingData, setApAgingData] = useState<APAgingData | null>(null);

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async () => {
    setIsRefreshing(true);

    const [summaryRes, healthRes, decisionsRes, cashflowRes, apAgingRes] = await Promise.allSettled([
      fetch('/api/executive/summary'),
      fetch('/api/executive/project-health'),
      fetch('/api/executive/decisions-required'),
      fetch('/api/executive/cashflow-snapshot'),
      fetch('/api/executive/ap-aging'),
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

    if (apAgingRes.status === 'fulfilled' && apAgingRes.value.ok) {
      const json = await apAgingRes.value.json();
      setApAgingData(json.data);
      setApAgingStatus('ok');
    } else {
      setApAgingStatus('error');
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

  const darkBg = isDark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900';
  const cardBorder = isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-200 bg-white';
  const mutedText = isDark ? 'text-slate-500' : 'text-gray-500';
  const headerText = isDark ? 'text-white' : 'text-gray-900';
  const btnBorder = isDark ? 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300' : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700';

  return (
    <div className={cn('min-h-screen', darkBg)}>
      <div className="w-full p-4 lg:p-6 space-y-5 max-lg:pt-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={cn('text-xl lg:text-2xl font-bold tracking-tight', headerText)}>
              OTS™ Executive Command Center
            </h1>
            <p className={cn('text-xs mt-0.5', mutedText)}>
              Real-time operational intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className={cn('hidden sm:flex items-center gap-1.5 text-xs', mutedText)}>
                <Clock className="size-3.5" />
                <span>
                  Updated {new Date(lastUpdated).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            <CountdownRing secondsLeft={countdown} total={REFRESH_INTERVAL} />
            <button
              onClick={() => setIsDark(d => !d)}
              className={cn('p-1.5 rounded-lg border transition-colors', btnBorder)}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              onClick={fetchAll}
              disabled={isRefreshing}
              className={cn(
                'p-1.5 rounded-lg border transition-colors',
                btnBorder,
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
          isDark={isDark}
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
            isDark={isDark}
          >
            {cashflowData ? (
              <CashFlowSnapshot data={cashflowData} />
            ) : (
              <div className={cn('h-40 rounded-lg animate-pulse', isDark ? 'bg-slate-800/30' : 'bg-gray-100')} />
            )}
          </SectionCard>

          {/* Production Pulse */}
          <SectionCard
            title="Production Pulse"
            status={cashflowStatus}
            lastUpdated={lastUpdated}
            isDark={isDark}
          >
            {cashflowData ? (
              <ProductionPulse data={cashflowData} />
            ) : (
              <div className={cn('h-40 rounded-lg animate-pulse', isDark ? 'bg-slate-800/30' : 'bg-gray-100')} />
            )}
          </SectionCard>

          {/* Decisions Required */}
          <SectionCard
            title={`Decisions Required${decisionItems.length > 0 ? ` (${decisionItems.length})` : ''}`}
            status={decisionsStatus}
            lastUpdated={lastUpdated}
            isDark={isDark}
          >
            <DecisionsRequired items={decisionItems} />
          </SectionCard>
        </div>

        {/* ── AP Aging — Next 30 Days ──────────────────────────────────────── */}
        <SectionCard
          title="AP Aging — Payables Due Next 30 Days"
          status={apAgingStatus}
          lastUpdated={lastUpdated}
          isDark={isDark}
        >
          {apAgingData ? (
            <APAgingWidget data={apAgingData} isDark={isDark} />
          ) : (
            <div className={cn('h-24 rounded-lg animate-pulse', isDark ? 'bg-slate-800/30' : 'bg-gray-100')} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
