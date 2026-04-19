'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  CalendarX,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AbsenceAnalyticsResult, PatternFlag, EmployeeAbsenceStat } from '@/app/api/hr/analytics/absence/route';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  sectionOptions: string[];
  occupationOptions: string[];
}

// ---------------------------------------------------------------------------
// KPI tile
// ---------------------------------------------------------------------------

type Tone = 'rose' | 'amber' | 'violet' | 'sky' | 'emerald';

const TONE: Record<Tone, string> = {
  rose:    'from-rose-50 to-white border-rose-200 text-rose-700',
  amber:   'from-amber-50 to-white border-amber-200 text-amber-700',
  violet:  'from-violet-50 to-white border-violet-200 text-violet-700',
  sky:     'from-sky-50 to-white border-sky-200 text-sky-700',
  emerald: 'from-emerald-50 to-white border-emerald-200 text-emerald-700',
};

function KpiTile({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: Tone;
  icon: React.ElementType;
}) {
  return (
    <div className={cn('rounded-xl border bg-gradient-to-b p-4 shadow-sm', TONE[tone])}>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert type badges
// ---------------------------------------------------------------------------

const ALERT_STYLES: Record<string, string> = {
  CONSECUTIVE_ABSENCE: 'bg-rose-100 text-rose-700 border-rose-200',
  WEEKEND_EXTENSION:   'bg-amber-100 text-amber-700 border-amber-200',
  ESCALATING_ABSENCES: 'bg-orange-100 text-orange-700 border-orange-200',
  FREQUENT_LEAVES:     'bg-violet-100 text-violet-700 border-violet-200',
};

const ALERT_LABELS: Record<string, string> = {
  CONSECUTIVE_ABSENCE: 'Consecutive Absence',
  WEEKEND_EXTENSION:   'Weekend Extension',
  ESCALATING_ABSENCES: 'Escalating Trend',
  FREQUENT_LEAVES:     'Frequent Leaves',
};

const SEVERITY_STYLES: Record<string, string> = {
  HIGH:   'bg-rose-600 text-white',
  MEDIUM: 'bg-amber-500 text-white',
};

// ---------------------------------------------------------------------------
// Absence frequency cell colors
// ---------------------------------------------------------------------------

function anpCellStyle(count: number): string {
  if (count === 0) return 'text-slate-300 bg-white';
  if (count <= 2)  return 'bg-amber-50 text-amber-700';
  if (count <= 4)  return 'bg-amber-100 text-amber-800';
  if (count <= 7)  return 'bg-rose-100 text-rose-700';
  return 'bg-rose-200 text-rose-900 font-bold';
}

// ---------------------------------------------------------------------------
// Collapsible card
// ---------------------------------------------------------------------------

function CollapsibleCard({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 border-b bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function AbsenceAnalyticsClient({ sectionOptions, occupationOptions }: Props) {
  const [months, setMonths] = useState(6);
  const [section, setSection] = useState('');
  const [occupation, setOccupation] = useState('');
  const [data, setData] = useState<AbsenceAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ months: String(months) });
      if (section) params.set('section', section);
      if (occupation) params.set('occupation', occupation);
      const res = await fetch(`/api/hr/analytics/absence?${params}`);
      if (!res.ok) throw new Error('Failed to load analytics data');
      const json = await res.json() as AbsenceAnalyticsResult;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [months, section, occupation]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Build sorted month list for frequency matrix columns
  const monthCols = data
    ? [...new Set(data.employeeStats.flatMap(e => Object.keys(e.monthlyAnp)))].sort()
    : [];

  // Employees with any ANP for the matrix
  const matrixRows = data
    ? data.employeeStats.filter(e => e.totalAnp > 0).slice(0, 50)
    : [];

  // Top leave requesters
  const topLeaveRequesters = data
    ? [...data.employeeStats]
        .filter(e => e.leaveRequestCount >= 2)
        .sort((a, b) => b.leaveRequestCount - a.leaveRequestCount)
        .slice(0, 20)
    : [];

  // Day of week bar chart data
  const dowEntries = data
    ? Object.entries(data.dayOfWeekDistribution)
    : [];
  const dowMax = dowEntries.length > 0 ? Math.max(...dowEntries.map(([, v]) => v)) : 1;
  const totalDow = dowEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero Banner */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <TrendingUp className="absolute -right-8 -top-8 h-48 w-48" />
          </div>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <TrendingUp className="h-3.5 w-3.5" />
                HR · Analytics
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-bold tracking-tight">Absence &amp; Leave Analytics</h1>
              <p className="mt-1 text-violet-100 text-sm md:text-base">
                Uncover behavioral patterns in team attendance and leave data
                {data && (
                  <span className="ml-2 opacity-75">· {data.period.from} → {data.period.to}</span>
                )}
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <select
                value={months}
                onChange={e => setMonths(Number(e.target.value))}
                className="rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {[3, 6, 9, 12].map(m => (
                  <option key={m} value={m} className="text-slate-900">{m} months</option>
                ))}
              </select>
              {sectionOptions.length > 0 && (
                <select
                  value={section}
                  onChange={e => setSection(e.target.value)}
                  className="rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="" className="text-slate-900">All sections</option>
                  {sectionOptions.map(s => (
                    <option key={s} value={s} className="text-slate-900">{s}</option>
                  ))}
                </select>
              )}
              {occupationOptions.length > 0 && (
                <select
                  value={occupation}
                  onChange={e => setOccupation(e.target.value)}
                  className="rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <option value="" className="text-slate-900">All positions</option>
                  {occupationOptions.map(o => (
                    <option key={o} value={o} className="text-slate-900">{o}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <span className="ml-3 text-slate-500">Analysing attendance patterns…</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* KPI Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <KpiTile
                label="ANP Days"
                value={data.summary.totalAnpDays}
                hint="absent without permission"
                tone="rose"
                icon={CalendarX}
              />
              <KpiTile
                label="Flagged"
                value={data.summary.flaggedEmployees}
                hint="employees with pattern alerts"
                tone="amber"
                icon={AlertTriangle}
              />
              <KpiTile
                label="Avg ANP"
                value={
                  data.summary.employeesWithAnp > 0
                    ? (data.summary.totalAnpDays / data.summary.employeesWithAnp).toFixed(1)
                    : '0'
                }
                hint="days per employee with ANP"
                tone="violet"
                icon={Users}
              />
              <KpiTile
                label="Leaves"
                value={data.summary.totalApprovedLeaves}
                hint="approved leave requests in period"
                tone="sky"
                icon={CalendarCheck}
              />
            </div>

            {/* Behavior Flags */}
            <CollapsibleCard
              title="Pattern Alerts"
              badge={
                data.flags.length > 0 ? (
                  <span className="rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold px-2 py-0.5">
                    {data.flags.length}
                  </span>
                ) : null
              }
            >
              {data.flags.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
                  <CalendarCheck className="h-10 w-10 text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-600">No behavioral patterns detected in this period</p>
                  <p className="text-xs text-slate-400">All team members are within normal absence thresholds</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-semibold">Employee</th>
                        <th className="px-4 py-3 text-left font-semibold">Occupation</th>
                        <th className="px-4 py-3 text-left font-semibold">Section</th>
                        <th className="px-4 py-3 text-left font-semibold">Pattern</th>
                        <th className="px-4 py-3 text-left font-semibold">Severity</th>
                        <th className="px-4 py-3 text-left font-semibold">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.flags.map((flag, i) => (
                        <FlagRow key={i} flag={flag} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CollapsibleCard>

            {/* Absence Frequency Matrix */}
            {matrixRows.length > 0 && (
              <CollapsibleCard title="Absence Frequency Matrix (ANP Days by Employee × Month)">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-slate-50 z-10 min-w-[180px]">Employee</th>
                        <th className="px-4 py-3 text-left font-semibold min-w-[100px]">Section</th>
                        {monthCols.map(m => (
                          <th key={m} className="px-3 py-3 text-center font-semibold min-w-[60px]">
                            {formatMonthHeader(m)}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center font-semibold min-w-[60px] bg-slate-100">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {matrixRows.map(emp => (
                        <tr key={emp.employeeId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 sticky left-0 bg-white z-10">
                            <div className="font-medium text-slate-800">{emp.fullNameEn}</div>
                            <div className="text-xs text-slate-400">{emp.employmentId}</div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{emp.section ?? '—'}</td>
                          {monthCols.map(m => {
                            const count = emp.monthlyAnp[m] ?? 0;
                            return (
                              <td key={m} className={cn('px-3 py-2.5 text-center text-xs font-mono', anpCellStyle(count))}>
                                {count === 0 ? '' : count}
                              </td>
                            );
                          })}
                          <td className={cn('px-4 py-2.5 text-center text-xs font-bold', anpCellStyle(emp.totalAnp))}>
                            {emp.totalAnp}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t flex items-center gap-3 text-xs text-slate-500">
                  <span className="font-medium">Legend:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">1–2 days</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">3–4 days</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">5–7 days</span>
                  <span className="px-2 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300 font-bold">8+ days</span>
                </div>
              </CollapsibleCard>
            )}

            {/* Day of Week Distribution */}
            {dowEntries.length > 0 && (
              <CollapsibleCard title="ANP Absences by Day of Week">
                <div className="px-6 py-6">
                  <div className="flex items-end gap-4 h-36">
                    {dowEntries.map(([day, count]) => {
                      const heightPct = dowMax > 0 ? (count / dowMax) * 100 : 0;
                      const isWeekendAdj = day === 'Monday' || day === 'Friday';
                      return (
                        <div key={day} className="flex flex-col items-center gap-1 flex-1">
                          <span className="text-xs font-semibold text-slate-600 tabular-nums">{count}</span>
                          <div className="w-full flex flex-col justify-end" style={{ height: '100px' }}>
                            <div
                              className={cn(
                                'w-full rounded-t-md transition-all',
                                isWeekendAdj ? 'bg-amber-400' : 'bg-violet-400',
                              )}
                              style={{ height: `${Math.max(heightPct, 4)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 text-center leading-tight">{day.slice(0, 3)}</span>
                          {totalDow > 0 && (
                            <span className="text-[10px] text-slate-400">{Math.round((count / totalDow) * 100)}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    <span className="inline-block w-3 h-3 rounded-sm bg-amber-400 mr-1 align-middle" />
                    Monday &amp; Friday highlighted — disproportionate spikes may indicate weekend-extension behavior.
                  </p>
                </div>
              </CollapsibleCard>
            )}

            {/* Monthly Company Trend */}
            {data.monthlyTrend.length > 0 && (
              <CollapsibleCard title="Monthly Company Absence Trend">
                <div className="px-6 py-6">
                  <div className="flex items-end gap-3">
                    {data.monthlyTrend.map(({ month, anpDays, apDays, sickDays }) => {
                      const total = anpDays + apDays + sickDays;
                      const maxTotal = Math.max(...data.monthlyTrend.map(m => m.anpDays + m.apDays + m.sickDays));
                      const scale = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                      const anpH = total > 0 ? (anpDays / total) * scale : 0;
                      const apH = total > 0 ? (apDays / total) * scale : 0;
                      const sickH = total > 0 ? (sickDays / total) * scale : 0;
                      return (
                        <div key={month} className="flex flex-col items-center gap-1 flex-1 min-w-[48px]">
                          <span className="text-[10px] text-slate-500 tabular-nums">{total}</span>
                          <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                            <div className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden" style={{ height: `${Math.max(scale, 4)}%` }}>
                              <div className="w-full bg-rose-400" style={{ height: `${anpH}%` }} title={`ANP: ${anpDays}`} />
                              <div className="w-full bg-amber-400" style={{ height: `${apH}%` }} title={`AP: ${apDays}`} />
                              <div className="w-full bg-orange-300" style={{ height: `${sickH}%` }} title={`Sick: ${sickDays}`} />
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 text-center">{formatMonthHeader(month)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-400 inline-block" />ANP (no permission)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />AP (with permission)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-300 inline-block" />Sick leave</span>
                  </div>
                </div>
              </CollapsibleCard>
            )}

            {/* Top Leave Requesters */}
            {topLeaveRequesters.length > 0 && (
              <CollapsibleCard title="Leave Request Frequency" defaultOpen={false}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-semibold">Employee</th>
                        <th className="px-4 py-3 text-left font-semibold">Section</th>
                        <th className="px-4 py-3 text-left font-semibold">Occupation</th>
                        <th className="px-4 py-3 text-center font-semibold">Total Leaves</th>
                        <th className="px-4 py-3 text-left font-semibold">By Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topLeaveRequesters.map(emp => (
                        <tr key={emp.employeeId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{emp.fullNameEn}</div>
                            <div className="text-xs text-slate-400">{emp.employmentId}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{emp.section ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{emp.occupation ?? '—'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-bold',
                              emp.leaveRequestCount >= 4 ? 'bg-rose-100 text-rose-700' :
                              emp.leaveRequestCount >= 3 ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600',
                            )}>
                              {emp.leaveRequestCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(emp.leavesByType).map(([code, count]) => (
                                <span key={code} className="rounded bg-violet-50 text-violet-700 border border-violet-200 text-xs px-1.5 py-0.5">
                                  {code}: {count}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CollapsibleCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FlagRow({ flag }: { flag: PatternFlag }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-800">{flag.fullNameEn}</div>
        <div className="text-xs text-slate-400">{flag.employmentId}</div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{flag.occupation ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-slate-500">{flag.section ?? '—'}</td>
      <td className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
          ALERT_STYLES[flag.alertType] ?? 'bg-slate-100 text-slate-600 border-slate-200',
        )}>
          {ALERT_LABELS[flag.alertType] ?? flag.alertType}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
          SEVERITY_STYLES[flag.severity] ?? 'bg-slate-200 text-slate-700',
        )}>
          {flag.severity}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">{flag.detail}</td>
    </tr>
  );
}

function formatMonthHeader(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
}
