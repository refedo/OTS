'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Languages } from 'lucide-react';
import { EmployeePicker, type EmployeePickerOption } from '@/components/hr/employee-picker';

type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  regularHours: string;
  overtimeHours: string;
  otMultiplier: string;
  isFriday: boolean;
  isPublicHoliday: boolean;
  rawCellA: string | null;
  rawCellP: string | null;
};

type Holiday = { date: string; nameEn: string; nameAr: string | null };

type Props = {
  workerType: 'EMPLOYEE' | 'MANPOWER_SLOT';
  workerId: string;
  workerLabel: string;
  workerArLabel: string | null;
  workerSubLabel: string;
  month: string;
  records: AttendanceRow[];
  holidays: Holiday[];
  employees?: EmployeePickerOption[];
};

const STATUS_COLOURS: Record<string, string> = {
  PRESENT: 'bg-green-200 text-green-900 border-green-300',
  ABSENT_WITH_PERMISSION: 'bg-orange-200 text-orange-900 border-orange-300',
  ABSENT_NO_PERMISSION: 'bg-red-200 text-red-900 border-red-300',
  ANNUAL_VACATION: 'bg-blue-200 text-blue-900 border-blue-300',
  SICK_LEAVE: 'bg-purple-200 text-purple-900 border-purple-300',
  WEEKEND: 'bg-gray-100 text-gray-600 border-gray-200',
  PUBLIC_HOLIDAY: 'bg-indigo-200 text-indigo-900 border-indigo-300',
  UNKNOWN: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_SHORT: Record<string, string> = {
  PRESENT: 'P',
  ABSENT_WITH_PERMISSION: 'AP',
  ABSENT_NO_PERMISSION: 'ANP',
  ANNUAL_VACATION: 'AV',
  SICK_LEAVE: 'SL',
  WEEKEND: '—',
  PUBLIC_HOLIDAY: 'PH',
  UNKNOWN: '?',
};

function daysInMonth(month: string): Date[] {
  const [y, m] = month.split('-').map(Number);
  const days: Date[] = [];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= last; d++) days.push(new Date(Date.UTC(y, m - 1, d)));
  return days;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function TimesheetClient({
  workerType,
  workerId,
  workerLabel,
  workerArLabel,
  workerSubLabel,
  month,
  records,
  holidays,
  employees = [],
}: Props) {
  const router = useRouter();
  const [showArabic, setShowArabic] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, AttendanceRow>();
    for (const r of records) map.set(r.date.slice(0, 10), r);
    return map;
  }, [records]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const h of holidays) map.set(h.date, h);
    return map;
  }, [holidays]);

  const days = useMemo(() => daysInMonth(month), [month]);

  const totals = useMemo(() => {
    let regular = 0;
    let overtime = 0;
    let present = 0;
    let absent = 0;
    let vacation = 0;
    let sick = 0;
    for (const r of records) {
      regular += Number(r.regularHours);
      overtime += Number(r.overtimeHours);
      if (r.status === 'PRESENT') present++;
      else if (r.status === 'ABSENT_WITH_PERMISSION' || r.status === 'ABSENT_NO_PERMISSION') absent++;
      else if (r.status === 'ANNUAL_VACATION') vacation++;
      else if (r.status === 'SICK_LEAVE') sick++;
    }
    return { regular, overtime, present, absent, vacation, sick };
  }, [records]);

  const displayName = showArabic && workerArLabel ? workerArLabel : workerLabel;

  const gotoMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    router.push(`/hr/attendance/timesheet/${workerType}/${workerId}?month=${next}`);
  };

  const gotoEmployee = (nextEmployeeId: string | null) => {
    if (!nextEmployeeId || nextEmployeeId === workerId) return;
    router.push(`/hr/attendance/timesheet/EMPLOYEE/${nextEmployeeId}?month=${month}`);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href={`/hr/attendance?month=${month}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to attendance
            </Button>
          </Link>
          <div>
            <h1
              className="text-2xl font-semibold"
              dir={showArabic && workerArLabel ? 'rtl' : 'ltr'}
            >
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground">{workerSubLabel}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {workerType === 'EMPLOYEE' && employees.length > 0 && (
            <EmployeePicker
              employees={employees}
              value={workerId}
              onChange={gotoEmployee}
              placeholder="Jump to employee…"
              triggerWidth="w-[260px]"
            />
          )}
          {workerArLabel && (
            <Button variant="outline" size="sm" onClick={() => setShowArabic((v) => !v)}>
              <Languages className="mr-2 h-4 w-4" />
              {showArabic ? 'English' : 'العربية'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => gotoMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium w-[110px] text-center">{month}</div>
          <Button variant="outline" size="sm" onClick={() => gotoMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Regular</div>
            <div className="text-xl font-semibold">{totals.regular.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Overtime</div>
            <div className="text-xl font-semibold text-blue-700">{totals.overtime.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Present days</div>
            <div className="text-xl font-semibold text-green-700">{totals.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Absent days</div>
            <div className="text-xl font-semibold text-red-700">{totals.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Vacation</div>
            <div className="text-xl font-semibold text-blue-700">{totals.vacation}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Sick leave</div>
            <div className="text-xl font-semibold text-purple-700">{totals.sick}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center font-medium text-muted-foreground pb-1">
                {d}
              </div>
            ))}
            {(() => {
              const firstDow = days[0]?.getUTCDay() ?? 0;
              const blanks = Array.from({ length: firstDow }, (_, i) => (
                <div key={`blank-${i}`} />
              ));
              const cells = days.map((d) => {
                const iso = d.toISOString().slice(0, 10);
                const rec = byDate.get(iso);
                const holiday = holidayMap.get(iso);
                const isFriday = d.getUTCDay() === 5;
                const status = rec?.status ?? (holiday ? 'PUBLIC_HOLIDAY' : isFriday ? 'WEEKEND' : 'UNKNOWN');
                const colour = STATUS_COLOURS[status] ?? STATUS_COLOURS.UNKNOWN;
                const title =
                  (holiday ? `${holiday.nameEn}\n` : '') +
                  (rec
                    ? `${status}\nRegular: ${rec.regularHours}h\nOT: ${rec.overtimeHours}h (×${rec.otMultiplier})${rec.rawCellA ? `\nA/P: ${rec.rawCellA}` : ''}${rec.rawCellP ? `\nO.T: ${rec.rawCellP}` : ''}`
                    : 'No record');
                return (
                  <div
                    key={iso}
                    title={title}
                    className={`border rounded p-2 min-h-[72px] ${colour}`}
                  >
                    <div className="font-semibold">{d.getUTCDate()}</div>
                    <div className="text-[10px] font-medium">{STATUS_SHORT[status] ?? status}</div>
                    {rec && Number(rec.regularHours) > 0 && (
                      <div className="text-[10px]">{Number(rec.regularHours).toFixed(1)}h</div>
                    )}
                    {rec && Number(rec.overtimeHours) > 0 && (
                      <div className="text-[10px]">+{Number(rec.overtimeHours).toFixed(1)} OT</div>
                    )}
                    {holiday && <div className="text-[9px] italic truncate">{holiday.nameEn}</div>}
                  </div>
                );
              });
              return [...blanks, ...cells];
            })()}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {Object.entries(STATUS_SHORT).map(([status, short]) => (
              <span
                key={status}
                className={`px-2 py-1 rounded border ${STATUS_COLOURS[status]}`}
              >
                {short} · {status.replace(/_/g, ' ').toLowerCase()}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
