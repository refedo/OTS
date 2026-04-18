'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type DayData = { status: string; regularHours: number; overtimeHours: number };

type EmployeeRow = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  occupation: string | null;
  section: string | null;
  days: Record<number, DayData>;
  summary: { present: number; absent: number; vacation: number; sick: number; weekend: number; holiday: number; unknown: number };
};

type GridData = {
  year: number;
  month: number;
  daysInMonth: number;
  employees: EmployeeRow[];
};

const STATUS_COLOR: Record<string, string> = {
  PRESENT:                  'bg-emerald-500 text-white',
  ABSENT_WITH_PERMISSION:   'bg-amber-400 text-white',
  ABSENT_NO_PERMISSION:     'bg-rose-500 text-white',
  ANNUAL_VACATION:          'bg-sky-500 text-white',
  SICK_LEAVE:               'bg-orange-400 text-white',
  WEEKEND:                  'bg-slate-200 text-slate-400',
  PUBLIC_HOLIDAY:           'bg-violet-300 text-violet-800',
  UNKNOWN:                  'bg-slate-300 text-slate-600',
};

const STATUS_ABBR: Record<string, string> = {
  PRESENT:                  'P',
  ABSENT_WITH_PERMISSION:   'AP',
  ABSENT_NO_PERMISSION:     'A',
  ANNUAL_VACATION:          'AV',
  SICK_LEAVE:               'SL',
  WEEKEND:                  'WE',
  PUBLIC_HOLIDAY:           'PH',
  UNKNOWN:                  '?',
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay(); // 0=Sun, 5=Fri
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
    <div className="space-y-4">
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
              <Users className="h-3 w-3" />{data.employees.length} employees
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
      ) : !data || data.employees.length === 0 ? (
        <div className="rounded-2xl border bg-gradient-to-b from-slate-50 to-white p-12 text-center space-y-2">
          <Users className="h-12 w-12 text-slate-200 mx-auto" />
          <p className="text-sm text-slate-500">No attendance records for {MONTH_NAMES[month - 1]} {year}</p>
          <p className="text-xs text-slate-400">Sync attendance data from PTS to populate this view</p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600 min-w-[160px] whitespace-nowrap border-r">
                    Employee
                  </th>
                  {days.map(d => {
                    const dow = getDayOfWeek(year, month, d);
                    const isFriday = dow === 5;
                    const isSaturday = dow === 6;
                    return (
                      <th key={d} className={cn(
                        'px-1 py-2 text-center font-medium text-slate-500 w-8 min-w-[28px]',
                        isFriday && 'bg-slate-100 text-slate-400',
                        isSaturday && 'bg-slate-100 text-slate-400',
                      )}>
                        <div>{d}</div>
                        <div className="text-[8px] font-normal">{['Su','Mo','Tu','We','Th','Fr','Sa'][dow]}</div>
                      </th>
                    );
                  })}
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 border-l min-w-[40px]">P</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 min-w-[40px]">A</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600 min-w-[40px]">AV</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp, idx) => (
                  <tr key={emp.id} className={cn('border-b last:border-0 hover:bg-blue-50/30 transition-colors', idx % 2 === 1 && 'bg-slate-50/50')}>
                    <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5 border-r">
                      <Link href={`/hr/employees/${emp.id}`} className="hover:underline">
                        <div className="font-medium text-slate-800 truncate max-w-[150px]">
                          {showAr && emp.fullNameAr ? emp.fullNameAr : emp.fullNameEn}
                        </div>
                        <div className="text-[10px] text-slate-400">{emp.employmentId}{emp.section ? ` · ${emp.section}` : ''}</div>
                      </Link>
                    </td>
                    {days.map(d => {
                      const cell = emp.days[d];
                      const dow = getDayOfWeek(year, month, d);
                      const isFriday = dow === 5;
                      if (!cell) {
                        return (
                          <td key={d} className={cn('px-1 py-1.5 text-center', isFriday && 'bg-slate-50')}>
                            <span className="inline-block w-5 h-5 rounded bg-slate-100 text-slate-300 text-[9px] flex items-center justify-center">—</span>
                          </td>
                        );
                      }
                      return (
                        <td key={d} className={cn('px-1 py-1.5 text-center', isFriday && 'bg-slate-50/80')}>
                          <span
                            title={`${cell.status.replace(/_/g, ' ')}${cell.regularHours > 0 ? ` · ${cell.regularHours}h` : ''}${cell.overtimeHours > 0 ? ` +${cell.overtimeHours}h OT` : ''}`}
                            className={cn('inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold cursor-default', STATUS_COLOR[cell.status] ?? 'bg-slate-200 text-slate-600')}
                          >
                            {STATUS_ABBR[cell.status] ?? '?'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center font-semibold text-emerald-700 border-l">{emp.summary.present}</td>
                    <td className="px-2 py-1.5 text-center font-semibold text-rose-600">{emp.summary.absent}</td>
                    <td className="px-2 py-1.5 text-center font-semibold text-sky-600">{emp.summary.vacation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
