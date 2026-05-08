'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Languages, Loader2, RefreshCw, Search, CalendarRange } from 'lucide-react';

type Employee = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
};

type ManpowerSlot = {
  id: string;
  slotCode: string;
  trade: string | null;
  agency: { id: string; nameEn: string; nameAr: string | null } | null;
};

type AttendanceRow = {
  id: string;
  workerType: 'EMPLOYEE' | 'MANPOWER_SLOT';
  date: string;
  status: string;
  regularHours: string;
  overtimeHours: string;
  otMultiplier: string;
  isFriday: boolean;
  isPublicHoliday: boolean;
  employee: Employee | null;
  manpowerSlot: ManpowerSlot | null;
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: 'Present',
  ABSENT_WITH_PERMISSION: 'AP — With permission',
  ABSENT_NO_PERMISSION: 'ANP — No permission',
  ANNUAL_VACATION: 'AV — Annual vacation',
  SICK_LEAVE: 'SL — Sick leave',
  WEEKEND: 'Weekend',
  PUBLIC_HOLIDAY: 'Public holiday',
  UNKNOWN: 'Unknown',
};

const STATUS_COLOURS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-800',
  ABSENT_WITH_PERMISSION: 'bg-orange-100 text-orange-800',
  ABSENT_NO_PERMISSION: 'bg-red-100 text-red-800',
  ANNUAL_VACATION: 'bg-blue-100 text-blue-800',
  SICK_LEAVE: 'bg-purple-100 text-purple-800',
  WEEKEND: 'bg-gray-100 text-gray-700',
  PUBLIC_HOLIDAY: 'bg-indigo-100 text-indigo-800',
  UNKNOWN: 'bg-slate-100 text-slate-700',
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

type AttendanceListClientProps = {
  initialMonth?: string;
  initialStatus?: string;
  initialWorkerType?: string;
};

export function AttendanceListClient({
  initialMonth,
  initialStatus = 'all',
  initialWorkerType = 'all',
}: AttendanceListClientProps = {}) {
  const [month, setMonth] = useState<string>(initialMonth ?? currentMonth());
  const [workerTypeFilter, setWorkerTypeFilter] = useState<string>(initialWorkerType);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [search, setSearch] = useState('');
  const [showArabic, setShowArabic] = useState(false);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ month });
      if (workerTypeFilter !== 'all') params.set('workerType', workerTypeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/hr/attendance?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load attendance');
      setRows(data.records ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [month, workerTypeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (r.workerType === 'EMPLOYEE' && r.employee) {
        return (
          r.employee.fullNameEn.toLowerCase().includes(q) ||
          (r.employee.fullNameAr ?? '').toLowerCase().includes(q) ||
          r.employee.employmentId.toLowerCase().includes(q)
        );
      }
      if (r.workerType === 'MANPOWER_SLOT' && r.manpowerSlot) {
        return (
          r.manpowerSlot.slotCode.toLowerCase().includes(q) ||
          (r.manpowerSlot.trade ?? '').toLowerCase().includes(q) ||
          (r.manpowerSlot.agency?.nameEn ?? '').toLowerCase().includes(q)
        );
      }
      return false;
    });
  }, [rows, search]);

  const totals = useMemo(() => {
    let regular = 0;
    let overtime = 0;
    for (const r of filtered) {
      regular += Number(r.regularHours);
      overtime += Number(r.overtimeHours);
    }
    return { regular, overtime };
  }, [filtered]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} records · {totals.regular.toFixed(1)}h regular ·{' '}
            {totals.overtime.toFixed(1)}h overtime
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArabic((v) => !v)}>
            <Languages className="mr-2 h-4 w-4" />
            {showArabic ? 'English' : 'العربية'}
          </Button>
          <Link href="/hr/attendance/sync">
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync from sheet
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID, slot code, agency…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={workerTypeFilter} onValueChange={setWorkerTypeFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Worker type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workers</SelectItem>
                <SelectItem value="EMPLOYEE">Employees</SelectItem>
                <SelectItem value="MANPOWER_SLOT">Manpower slots</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <div className="text-sm text-red-700">{error}</div>}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">Date</th>
                  <th className="p-2 font-medium">Worker</th>
                  <th className="p-2 font-medium">Type</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium text-right">Regular</th>
                  <th className="p-2 font-medium text-right">OT</th>
                  <th className="p-2 font-medium text-right">OT ×</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No attendance records for the selected filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((r) => {
                    const isEmp = r.workerType === 'EMPLOYEE' && r.employee;
                    const displayName = isEmp
                      ? showArabic && r.employee!.fullNameAr
                        ? r.employee!.fullNameAr
                        : r.employee!.fullNameEn
                      : r.manpowerSlot?.slotCode ?? '—';
                    const subLabel = isEmp
                      ? r.employee!.employmentId
                      : r.manpowerSlot?.agency
                        ? showArabic && r.manpowerSlot.agency.nameAr
                          ? r.manpowerSlot.agency.nameAr
                          : r.manpowerSlot.agency.nameEn
                        : '—';
                    const href = isEmp
                      ? `/hr/attendance/timesheet/EMPLOYEE/${r.employee!.id}?month=${month}`
                      : `/hr/attendance/timesheet/MANPOWER_SLOT/${r.manpowerSlot!.id}?month=${month}`;
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/40">
                        <td className="p-2 font-mono text-xs">{r.date.slice(0, 10)}</td>
                        <td
                          className="p-2"
                          dir={isEmp && showArabic && r.employee!.fullNameAr ? 'rtl' : 'ltr'}
                        >
                          <Link href={href} className="font-medium hover:underline">
                            {displayName}
                          </Link>
                          <div className="text-xs text-muted-foreground">{subLabel}</div>
                        </td>
                        <td className="p-2 text-xs">
                          {isEmp ? 'Employee' : 'Manpower'}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${STATUS_COLOURS[r.status] ?? ''}`}
                          >
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="p-2 text-right">{Number(r.regularHours).toFixed(1)}</td>
                        <td className="p-2 text-right">{Number(r.overtimeHours).toFixed(1)}</td>
                        <td className="p-2 text-right text-xs text-muted-foreground">
                          {Number(r.otMultiplier).toFixed(2)}×
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
