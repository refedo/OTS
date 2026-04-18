'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Users, HardHat, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type DayData = { status: string; regularHours: number; overtimeHours: number };

type DaySummary = {
  present: number;
  absentWithPermission: number;
  absentNoPermission: number;
  vacation: number;
  sick: number;
  weekend: number;
  holiday: number;
  unknown: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
};

type EmployeeRow = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  occupation: string | null;
  section: string | null;
  days: Record<number, DayData>;
  summary: DaySummary;
};

type ManpowerRow = {
  id: string;
  slotCode: string;
  trade: string;
  agencyName: string;
  days: Record<number, DayData>;
  summary: DaySummary;
};

type GridData = {
  year: number;
  month: number;
  daysInMonth: number;
  aggregates: { employees: DaySummary; manpower: DaySummary };
  employees: EmployeeRow[];
  manpower: ManpowerRow[];
};

const STATUS_COLOR: Record<string, string> = {
  PRESENT:                'bg-emerald-500 text-white',
  ABSENT_WITH_PERMISSION: 'bg-amber-400 text-white',
  ABSENT_NO_PERMISSION:   'bg-rose-500 text-white',
  ANNUAL_VACATION:        'bg-sky-500 text-white',
  SICK_LEAVE:             'bg-orange-400 text-white',
  WEEKEND:                'bg-slate-200 text-slate-400',
  PUBLIC_HOLIDAY:         'bg-violet-300 text-violet-800',
  UNKNOWN:                'bg-slate-300 text-slate-600',
};

const STATUS_ABBR: Record<string, string> = {
  PRESENT:                'P',
  ABSENT_WITH_PERMISSION: 'AP',
  ABSENT_NO_PERMISSION:   'A',
  ANNUAL_VACATION:        'AV',
  SICK_LEAVE:             'SL',
  WEEKEND:                'WE',
  PUBLIC_HOLIDAY:         'PH',
  UNKNOWN:                '?',
};

const SUMMARY_COLS = [
  { key: 'present',              label: 'P',   color: 'text-emerald-700' },
  { key: 'absentWithPermission', label: 'AP',  color: 'text-amber-600'   },
  { key: 'absentNoPermission',   label: 'A',   color: 'text-rose-600'    },
  { key: 'vacation',             label: 'AV',  color: 'text-sky-600'     },
  { key: 'sick',                 label: 'SL',  color: 'text-orange-600'  },
  { key: 'weekend',              label: 'WE',  color: 'text-slate-500'   },
  { key: 'holiday',              label: 'PH',  color: 'text-violet-600'  },
  { key: 'unknown',              label: '?',   color: 'text-slate-400'   },
] as const;

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay();
}

function fmtH(h: number) {
  return h % 1 === 0 ? String(h) : h.toFixed(1);
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={cn('rounded-xl border p-3 shadow-sm', color)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function AggregateKpis({ agg, title, icon: Icon, colorClass }: { agg: DaySummary; title: string; icon: React.ElementType; colorClass: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', colorClass)} />
        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <KpiCard label="Regular Hrs" value={fmtH(agg.totalRegularHours)} color="bg-slate-50 border-slate-200 text-slate-700" />
        <KpiCard label="Overtime Hrs" value={fmtH(agg.totalOvertimeHours)} color="bg-amber-50 border-amber-200 text-amber-700" />
        <KpiCard label="Present" value={agg.present} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
        <KpiCard label="Absent (perm)" value={agg.absentWithPermission} color="bg-amber-50 border-amber-200 text-amber-700" />
        <KpiCard label="Absent (no perm)" value={agg.absentNoPermission} color="bg-rose-50 border-rose-200 text-rose-700" />
        <KpiCard label="Annual Leave" value={agg.vacation} color="bg-sky-50 border-sky-200 text-sky-700" />
        <KpiCard label="Sick Leave" value={agg.sick} color="bg-orange-50 border-orange-200 text-orange-700" />
        <KpiCard label="Weekend" value={agg.weekend} color="bg-slate-50 border-slate-200 text-slate-500" />
        <KpiCard label="Public Holiday" value={agg.holiday} color="bg-violet-50 border-violet-200 text-violet-700" />
        <KpiCard label="Unknown" value={agg.unknown} color="bg-slate-50 border-slate-200 text-slate-400" />
      </div>
    </div>
  );
}

function GridTable<T extends { id: string; days: Record<number, DayData>; summary: DaySummary }>({
  rows,
  days,
  year,
  month,
  renderLabel,
}: {
  rows: T[];
  days: number[];
  year: number;
  month: number;
  renderLabel: (row: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 min-w-[160px] whitespace-nowrap border-r">
                Worker
              </th>
              {days.map(d => {
                const dow = getDayOfWeek(year, month, d);
                return (
                  <th key={d} className={cn('px-1 py-2 text-center font-medium text-slate-500 w-8 min-w-[28px]', (dow === 5 || dow === 6) && 'bg-slate-100 text-slate-400')}>
                    <div>{d}</div>
                    <div className="text-[8px] font-normal">{['Su','Mo','Tu','We','Th','Fr','Sa'][dow]}</div>
                  </th>
                );
              })}
              {/* Summary columns header */}
              {SUMMARY_COLS.map(c => (
                <th key={c.key} className="px-1 py-2 text-center font-semibold text-slate-600 border-l min-w-[30px] first:border-l">
                  <span className={cn('text-[10px]', c.color)}>{c.label}</span>
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold text-slate-600 border-l min-w-[48px] whitespace-nowrap text-[10px]">Reg h</th>
              <th className="px-2 py-2 text-center font-semibold text-amber-700 min-w-[48px] whitespace-nowrap text-[10px]">OT h</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className={cn('border-b last:border-0 hover:bg-blue-50/30 transition-colors', idx % 2 === 1 && 'bg-slate-50/50')}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 border-r">
                  {renderLabel(row)}
                </td>
                {days.map(d => {
                  const cell = row.days[d];
                  const dow = getDayOfWeek(year, month, d);
                  if (!cell) {
                    return (
                      <td key={d} className={cn('px-1 py-1.5 text-center', (dow === 5 || dow === 6) && 'bg-slate-50')}>
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 text-slate-300 text-[9px]">—</span>
                      </td>
                    );
                  }
                  return (
                    <td key={d} className={cn('px-1 py-1.5 text-center', (dow === 5 || dow === 6) && 'bg-slate-50/80')}>
                      <span
                        title={`${cell.status.replace(/_/g, ' ')}${cell.regularHours > 0 ? ` · ${cell.regularHours}h` : ''}${cell.overtimeHours > 0 ? ` +${cell.overtimeHours}h OT` : ''}`}
                        className={cn('inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold cursor-default', STATUS_COLOR[cell.status] ?? 'bg-slate-200 text-slate-600')}
                      >
                        {STATUS_ABBR[cell.status] ?? '?'}
                      </span>
                    </td>
                  );
                })}
                {SUMMARY_COLS.map(c => (
                  <td key={c.key} className={cn('px-1 py-1.5 text-center font-semibold border-l text-[11px]', c.color)}>
                    {(row.summary as unknown as Record<string, number>)[c.key] || 0}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center text-[11px] font-semibold text-slate-700 border-l">
                  {fmtH(row.summary.totalRegularHours)}
                </td>
                <td className="px-2 py-1.5 text-center text-[11px] font-semibold text-amber-700">
                  {fmtH(row.summary.totalOvertimeHours)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AttendanceMonthlyGrid() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAr, setShowAr] = useState(false);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/hr/attendance/grid?year=${y}&month=${m}`);
      if (!res.ok) throw new Error('Failed to load grid');
      setData(await res.json());
    } catch {
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(year, month); }, [load, year, month]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const days = data ? Array.from({ length: data.daysInMonth }, (_, i) => i + 1) : [];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth} disabled={loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-base font-semibold text-slate-800 min-w-[150px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth} disabled={loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAr(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-700 border rounded px-2 py-1"
          >
            {showAr ? 'Show EN names' : 'Show AR names'}
          </button>
          {data && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Users className="h-3 w-3" />{data.employees.length} emp
              <HardHat className="h-3 w-3 ml-1" />{data.manpower.length} mp
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px]">
        {Object.entries(STATUS_ABBR).map(([key, abbr]) => (
          <div key={key} className="flex items-center gap-1">
            <span className={cn('w-5 h-5 rounded text-[9px] flex items-center justify-center font-bold', STATUS_COLOR[key])}>
              {abbr}
            </span>
            <span className="text-slate-500">{key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />Loading attendance grid…
        </div>
      ) : error ? (
        <div className="py-10 text-center text-rose-500 text-sm">{error}</div>
      ) : !data || (data.employees.length === 0 && data.manpower.length === 0) ? (
        <div className="rounded-2xl border bg-gradient-to-b from-slate-50 to-white p-12 text-center space-y-2">
          <Users className="h-12 w-12 text-slate-200 mx-auto" />
          <p className="text-sm text-slate-500">No attendance records for {MONTH_NAMES[month - 1]} {year}</p>
          <p className="text-xs text-slate-400">Sync attendance data from PTS to populate this view</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── KPI Aggregate Cards ───────────────────────────────────────── */}
          <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-6">
            <div className="flex items-center gap-2 border-b pb-3">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">{MONTH_NAMES[month - 1]} {year} — Aggregate Totals</span>
            </div>
            {data.employees.length > 0 && (
              <AggregateKpis agg={data.aggregates.employees} title="Employees" icon={Users} colorClass="text-sky-600" />
            )}
            {data.manpower.length > 0 && (
              <AggregateKpis agg={data.aggregates.manpower} title="Manpower Slots" icon={HardHat} colorClass="text-violet-600" />
            )}
          </div>

          {/* ── Employee Grid ─────────────────────────────────────────────── */}
          {data.employees.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-semibold text-slate-700">Employees ({data.employees.length})</span>
              </div>
              <GridTable
                rows={data.employees}
                days={days}
                year={year}
                month={month}
                renderLabel={(emp) => (
                  <Link href={`/hr/employees/${emp.id}`} className="hover:underline">
                    <div className="font-medium text-slate-800 truncate max-w-[150px]">
                      {showAr && emp.fullNameAr ? emp.fullNameAr : emp.fullNameEn}
                    </div>
                    <div className="text-[10px] text-slate-400">{emp.employmentId}{emp.section ? ` · ${emp.section}` : ''}</div>
                  </Link>
                )}
              />
            </div>
          )}

          {/* ── Manpower Grid ─────────────────────────────────────────────── */}
          {data.manpower.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardHat className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-slate-700">Manpower Slots ({data.manpower.length})</span>
              </div>
              <GridTable
                rows={data.manpower}
                days={days}
                year={year}
                month={month}
                renderLabel={(mp) => (
                  <div>
                    <div className="font-medium text-slate-800 truncate max-w-[150px]">{mp.slotCode}</div>
                    <div className="text-[10px] text-slate-400">{mp.trade}{mp.agencyName ? ` · ${mp.agencyName}` : ''}</div>
                  </div>
                )}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
