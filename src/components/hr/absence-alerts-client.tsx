'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Users,
  FileWarning,
  Loader2,
  RefreshCw,
  Check,
  X,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types (shape returned by GET /api/hr/absence-alerts)
// ---------------------------------------------------------------------------

interface Alert {
  id: string;
  employeeId: string;
  windowType: 'CONSECUTIVE' | 'INTERMITTENT';
  kind: 'PRE_THRESHOLD' | 'THRESHOLD';
  thresholdDays: number;
  anpDays: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedLetterType: string | null;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'LETTER_LINKED' | 'RESOLVED' | 'DISMISSED';
  periodFrom: string;
  periodTo: string;
  detail: string;
  createdAt: string;
  linkedLetterId: string | null;
  employee: { id: string; fullNameEn: string; employmentId: string; occupation: string | null; section: string | null };
  linkedLetter: { id: string; letterNumber: string; letterType: string; status: string } | null;
}

interface Kpis {
  open: number;
  high: number;
  letterLinked: number;
  flaggedEmployees: number;
}

type StatusFilter = 'ALL' | Alert['status'];
type WindowFilter = 'ALL' | Alert['windowType'];
type SeverityFilter = 'ALL' | Alert['severity'];

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

const SEVERITY_STYLE: Record<string, string> = {
  HIGH: 'bg-rose-100 text-rose-700 border-rose-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-sky-100 text-sky-700 border-sky-200',
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-rose-100 text-rose-700 border-rose-200',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700 border-amber-200',
  LETTER_LINKED: 'bg-violet-100 text-violet-700 border-violet-200',
  RESOLVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DISMISSED: 'bg-slate-100 text-slate-500 border-slate-200',
};

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
}

function letterLabel(t: string | null): string {
  return t ? t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
}

type Tone = 'rose' | 'amber' | 'violet' | 'sky';
const TONE: Record<Tone, string> = {
  rose: 'from-rose-50 to-white border-rose-200 text-rose-700',
  amber: 'from-amber-50 to-white border-amber-200 text-amber-700',
  violet: 'from-violet-50 to-white border-violet-200 text-violet-700',
  sky: 'from-sky-50 to-white border-sky-200 text-sky-700',
};

function KpiTile({
  label,
  value,
  hint,
  tone,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  tone: Tone;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-gradient-to-b p-4 text-left shadow-sm transition hover:shadow-md',
        TONE[tone],
        active && 'ring-2 ring-offset-1 ring-slate-400',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

type SortKey = 'employee' | 'windowType' | 'anpDays' | 'thresholdDays' | 'severity' | 'status' | 'createdAt';
const SEVERITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function AbsenceAlertsClient() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kpis, setKpis] = useState<Kpis>({ open: 0, high: 0, letterLinked: 0, flaggedEmployees: 0 });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [windowFilter, setWindowFilter] = useState<WindowFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ pageSize: '500' });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (windowFilter !== 'ALL') params.set('windowType', windowFilter);
      if (severityFilter !== 'ALL') params.set('severity', severityFilter);
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`/api/hr/absence-alerts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load alerts');
      const data = await res.json();
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      if (data.kpis) setKpis(data.kpis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, windowFilter, severityFilter, search]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const runNow = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/absence-alerts/evaluate', { method: 'POST' });
      if (!res.ok) throw new Error('Evaluation failed');
      await fetchAlerts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed');
    } finally {
      setRunning(false);
    }
  }, [fetchAlerts]);

  const act = useCallback(
    async (id: string, action: 'acknowledge' | 'resolve' | 'dismiss' | 'create-letter') => {
      if (action === 'create-letter' && !confirm('Create a disciplinary letter for this alert? It will be submitted for CEO approval.')) {
        return;
      }
      setBusyId(id);
      setError(null);
      try {
        const res = await fetch(`/api/hr/absence-alerts/${id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Action failed');
        }
        await fetchAlerts();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Action failed');
      } finally {
        setBusyId(null);
      }
    },
    [fetchAlerts],
  );

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const sorted = useMemo(() => {
    const arr = [...alerts];
    const dir = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sort.key) {
        case 'employee':
          return a.employee.fullNameEn.localeCompare(b.employee.fullNameEn) * dir;
        case 'windowType':
          return a.windowType.localeCompare(b.windowType) * dir;
        case 'anpDays':
          return (a.anpDays - b.anpDays) * dir;
        case 'thresholdDays':
          return (a.thresholdDays - b.thresholdDays) * dir;
        case 'severity':
          return ((SEVERITY_RANK[a.severity] ?? 0) - (SEVERITY_RANK[b.severity] ?? 0)) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'createdAt':
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
    return arr;
  }, [alerts, sort]);

  const SortableHeader = ({ col, label, className }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={cn(
        'cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-100',
        className,
      )}
      onClick={() => toggleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sort.key === col ? (sort.dir === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="border-b bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white">
        <div className="px-6 py-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 opacity-70" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-300">HR › Absence Alerts</span>
              </div>
              <h1 className="text-2xl font-bold">Unauthorized Absence Alerts</h1>
              <p className="mt-1 text-sm text-slate-300">
                Saudi Labor Law escalation — consecutive (5/10/15) and intermittent (10/20/30 over a rolling year)
                {loading ? '' : ` · ${alerts.length} shown`}
              </p>
            </div>
            <button
              type="button"
              onClick={runNow}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20 disabled:opacity-60"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run evaluation now
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6">
        {/* KPI strip — tiles filter the table */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Open alerts"
            value={kpis.open}
            hint="Awaiting HR action"
            tone="rose"
            icon={AlertTriangle}
            active={statusFilter === 'OPEN'}
            onClick={() => setStatusFilter((s) => (s === 'OPEN' ? 'ALL' : 'OPEN'))}
          />
          <KpiTile
            label="High severity"
            value={kpis.high}
            hint="Open / acknowledged, HIGH"
            tone="amber"
            icon={ShieldAlert}
            active={severityFilter === 'HIGH'}
            onClick={() => setSeverityFilter((s) => (s === 'HIGH' ? 'ALL' : 'HIGH'))}
          />
          <KpiTile
            label="Employees flagged"
            value={kpis.flaggedEmployees}
            hint="With open/ack alerts"
            tone="sky"
            icon={Users}
            active={false}
            onClick={() => setStatusFilter('ALL')}
          />
          <KpiTile
            label="Letters linked"
            value={kpis.letterLinked}
            hint="Disciplinary letter issued"
            tone="violet"
            icon={FileWarning}
            active={statusFilter === 'LETTER_LINKED'}
            onClick={() => setStatusFilter((s) => (s === 'LETTER_LINKED' ? 'ALL' : 'LETTER_LINKED'))}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Search by employee name or ID…"
            className="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="LETTER_LINKED">Letter linked</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={windowFilter}
            onChange={(e) => setWindowFilter(e.target.value as WindowFilter)}
          >
            <option value="ALL">All windows</option>
            <option value="CONSECUTIVE">Consecutive</option>
            <option value="INTERMITTENT">Intermittent</option>
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          >
            <option value="ALL">All severities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <SortableHeader col="employee" label="Employee" />
                <SortableHeader col="windowType" label="Window" />
                <SortableHeader col="anpDays" label="ANP Days" className="text-right" />
                <SortableHeader col="thresholdDays" label="Threshold" className="text-right" />
                <SortableHeader col="severity" label="Severity" />
                <SortableHeader col="status" label="Status" />
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Recommended letter</th>
                <SortableHeader col="createdAt" label="Detected" />
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-slate-400">
                    No absence alerts match the current filters.
                  </td>
                </tr>
              ) : (
                sorted.map((a) => {
                  const closed = a.status === 'RESOLVED' || a.status === 'DISMISSED';
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{a.employee.fullNameEn}</div>
                        <div className="text-xs text-slate-400">
                          {a.employee.employmentId}
                          {a.employee.occupation ? ` · ${a.employee.occupation}` : ''}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">
                        {a.windowType === 'CONSECUTIVE' ? 'Consecutive' : 'Intermittent'}
                        {a.kind === 'PRE_THRESHOLD' && (
                          <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">EARLY</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">{a.anpDays}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{a.thresholdDays}</td>
                      <td className="px-3 py-2">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', SEVERITY_STYLE[a.severity])}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', STATUS_STYLE[a.status])}>
                          {a.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">
                        {a.linkedLetter ? (
                          <span className="text-violet-700">{a.linkedLetter.letterNumber}</span>
                        ) : (
                          letterLabel(a.recommendedLetterType)
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(a.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {busyId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <>
                              {a.status === 'OPEN' && (
                                <button
                                  type="button"
                                  title="Acknowledge"
                                  onClick={() => act(a.id, 'acknowledge')}
                                  className="rounded p-1 text-amber-600 hover:bg-amber-50"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              {a.recommendedLetterType && !a.linkedLetterId && !closed && (
                                <button
                                  type="button"
                                  title="Create disciplinary letter"
                                  onClick={() => act(a.id, 'create-letter')}
                                  className="rounded p-1 text-violet-600 hover:bg-violet-50"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                              )}
                              {!closed && (
                                <button
                                  type="button"
                                  title="Resolve"
                                  onClick={() => act(a.id, 'resolve')}
                                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                              )}
                              {!closed && (
                                <button
                                  type="button"
                                  title="Dismiss (false positive)"
                                  onClick={() => act(a.id, 'dismiss')}
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
