'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PieChart,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConcentrationRiskSummary, CustomerConcentrationResult, ProjectConcentrationResult, SegmentConcentrationResult, SupplierConcentrationResult, ResourceConcentrationResult, RevenueTimingResult } from '@/lib/concentration-risk/types';
import { ExecutiveSummaryCards } from './ExecutiveSummaryCards';
import { RiskHeatmap } from './RiskHeatmap';
import { CustomerTable } from './CustomerTable';
import { ProjectTable } from './ProjectTable';
import { SupplierTable } from './SupplierTable';
import { ResourceTable } from './ResourceTable';
import { RevenueTimingChart } from './RevenueTimingChart';
import { RiskFiltersPanel } from './RiskFiltersPanel';

type TabKey = 'summary' | 'customers' | 'projects' | 'segments' | 'suppliers' | 'resources' | 'revenue';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Executive Summary' },
  { key: 'customers', label: 'Customers' },
  { key: 'projects', label: 'Projects' },
  { key: 'segments', label: 'Segments' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'resources', label: 'Operational Dependency' },
  { key: 'revenue', label: 'Revenue Timing' },
];

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function ConcentrationRiskDashboard() {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState<TabKey>('summary');
  const [year, setYear] = useState<string>(String(currentYear));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [summary, setSummary] = useState<ConcentrationRiskSummary | null>(null);
  const [customers, setCustomers] = useState<CustomerConcentrationResult | null>(null);
  const [projects, setProjects] = useState<ProjectConcentrationResult | null>(null);
  const [segments, setSegments] = useState<SegmentConcentrationResult | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierConcentrationResult | null>(null);
  const [resources, setResources] = useState<ResourceConcentrationResult | null>(null);
  const [revenueTiming, setRevenueTiming] = useState<RevenueTimingResult | null>(null);

  const query = buildQuery({ year });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, p, seg, sup, res, rev] = await Promise.all([
        fetch(`/api/concentration-risk/summary${query}`).then((r) => r.json()),
        fetch(`/api/concentration-risk/customers${query}`).then((r) => r.json()),
        fetch(`/api/concentration-risk/projects${query}`).then((r) => r.json()),
        fetch(`/api/concentration-risk/segments${query}`).then((r) => r.json()),
        fetch(`/api/concentration-risk/suppliers${query}`).then((r) => r.json()),
        fetch(`/api/concentration-risk/resources${query}`).then((r) => r.json()),
        fetch(`/api/concentration-risk/revenue-timing${query}`).then((r) => r.json()),
      ]);
      setSummary(s);
      setCustomers(c);
      setProjects(p);
      setSegments(seg);
      setSuppliers(sup);
      setResources(res);
      setRevenueTiming(rev);
    } catch {
      setError('Failed to load concentration risk data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleExport() {
    setExporting(true);
    try {
      const resp = await fetch(`/api/concentration-risk/export${query}`);
      if (!resp.ok) {
        const err = await resp.json();
        alert(err.error ?? 'Export failed');
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `concentration-risk-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    } finally {
      setExporting(false);
    }
  }

  const riskColor = summary
    ? summary.riskLabel === 'critical' ? 'text-red-400'
    : summary.riskLabel === 'high' ? 'text-orange-400'
    : summary.riskLabel === 'medium' ? 'text-amber-400'
    : summary.riskLabel === 'insufficient_data' ? 'text-slate-400'
    : 'text-emerald-400'
    : 'text-slate-400';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30">
            <PieChart className="h-6 w-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Concentration Risk Dashboard</h1>
            <p className="text-sm text-slate-400">Exposure analysis across customers, projects, suppliers &amp; operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year selector */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
            >
              {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={String(y)} className="bg-slate-800">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg px-3 py-2 text-sm transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>

          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 bg-violet-600/90 hover:bg-violet-600 border border-violet-500/50 text-white rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Overall Risk Badge */}
      {summary && !loading && (
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-700/50 rounded-xl px-4 py-3">
          <Shield className={cn('h-5 w-5', riskColor)} />
          <span className="text-sm text-slate-400">Overall Concentration Risk Score:</span>
          <span className={cn('text-2xl font-bold', riskColor)}>{summary.overallScore}</span>
          <span className={cn('text-sm font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border', riskColor,
            summary.riskLabel === 'low' ? 'bg-emerald-500/10 border-emerald-500/30'
            : summary.riskLabel === 'medium' ? 'bg-amber-500/10 border-amber-500/30'
            : summary.riskLabel === 'high' ? 'bg-orange-500/10 border-orange-500/30'
            : summary.riskLabel === 'critical' ? 'bg-red-500/10 border-red-500/30'
            : 'bg-slate-500/10 border-slate-500/30'
          )}>
            {summary.riskLabel}
          </span>
          {summary.insufficientData && (
            <span className="text-xs text-slate-500 ml-2">(Insufficient data — score may be understated)</span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-700/50 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="min-h-[400px]">
          {activeTab === 'summary' && summary && (
            <div className="space-y-6">
              <ExecutiveSummaryCards summary={summary} />
              {customers && projects && segments && suppliers && resources && revenueTiming && (
                <RiskHeatmap
                  customer={customers}
                  project={projects}
                  segment={segments}
                  supplier={suppliers}
                  resource={resources}
                  revenueTiming={revenueTiming}
                />
              )}
            </div>
          )}
          {activeTab === 'customers' && customers && (
            <CustomerTable data={customers} />
          )}
          {activeTab === 'projects' && projects && (
            <ProjectTable data={projects} />
          )}
          {activeTab === 'segments' && segments && (
            <SegmentTable data={segments} />
          )}
          {activeTab === 'suppliers' && suppliers && (
            <SupplierTable data={suppliers} />
          )}
          {activeTab === 'resources' && resources && (
            <ResourceTable data={resources} />
          )}
          {activeTab === 'revenue' && revenueTiming && (
            <RevenueTimingChart data={revenueTiming} />
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-800/60 rounded-xl border border-slate-700/30" />
        ))}
      </div>
      <div className="h-64 bg-slate-800/60 rounded-xl border border-slate-700/30" />
    </div>
  );
}

// Inline SegmentTable (simple, no separate file needed)
function SegmentTable({ data }: { data: SegmentConcentrationResult }) {
  if (data.insufficientData) return <InsufficientData label="segment" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricBox label="Segments" value={String(data.rows.length)} />
        <MetricBox label="Largest Segment" value={`${(data.largestShare * 100).toFixed(1)}%`} risk={data.riskLevel} />
        <MetricBox label="Segment HHI" value={data.hhi.toFixed(4)} />
        <MetricBox label="Risk Level" value={data.riskLevel.toUpperCase()} risk={data.riskLevel} />
      </div>
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Segment / Market</th>
              <th className="px-4 py-3 text-right">Contract Exposure (SAR)</th>
              <th className="px-4 py-3 text-right">Share %</th>
              <th className="px-4 py-3 text-right">Projects</th>
              <th className="px-4 py-3 text-center">Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.segment} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-200">{row.segment}</td>
                <td className="px-4 py-3 text-right text-slate-300">{formatSAR(row.contractExposure)}</td>
                <td className="px-4 py-3 text-right font-medium">{(row.share * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right text-slate-400">{row.projectCount}</td>
                <td className="px-4 py-3 text-center"><RiskBadge level={row.riskLevel} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">No segment data available</div>
        )}
      </div>
    </div>
  );
}

// Shared helpers used across this file
export function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    insufficient_data: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  return (
    <span className={cn('inline-block px-2 py-0.5 text-xs font-medium rounded-full border capitalize', styles[level] ?? styles.insufficient_data)}>
      {level === 'insufficient_data' ? 'N/A' : level}
    </span>
  );
}

export function MetricBox({ label, value, risk }: { label: string; value: string; risk?: string }) {
  const textColor = risk
    ? risk === 'high' || risk === 'critical' ? 'text-red-400'
    : risk === 'medium' ? 'text-amber-400'
    : risk === 'low' ? 'text-emerald-400'
    : 'text-slate-300'
    : 'text-slate-200';

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={cn('text-xl font-bold', textColor)}>{value}</p>
    </div>
  );
}

export function InsufficientData({ label }: { label: string }) {
  return (
    <div className="bg-slate-900/40 border border-slate-700/40 rounded-xl px-6 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-slate-500 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">Insufficient Data</p>
      <p className="text-slate-500 text-sm mt-1">
        No {label} data found for the selected period. Add records to unlock this analysis.
      </p>
    </div>
  );
}

export function formatSAR(value: number): string {
  return new Intl.NumberFormat('en-SA', { maximumFractionDigits: 0 }).format(value);
}
