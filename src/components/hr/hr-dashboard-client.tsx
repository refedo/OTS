'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  RefreshCw,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plane,
  Stethoscope,
  CalendarDays,
  FileText,
} from 'lucide-react';
import type { HrDashboardResult, HrDashboardGroupBy } from '@/lib/services/hr/hr-dashboard-stats';

type ContractStats = {
  totalActive: number;
  expiringIn7: number;
  expiringIn30: number;
  expired: number;
};

type Props = {
  initialStats: HrDashboardResult;
  departments: { id: string; name: string }[];
  occupations: string[];
  sections: string[];
  contractStats?: ContractStats;
};

const ABSENCE_COLORS: Record<string, string> = {
  present: '#10b981',
  absentWithPermission: '#f59e0b',
  absentNoPermission: '#ef4444',
  annualVacation: '#3b82f6',
  sickLeave: '#a855f7',
  weekend: '#9ca3af',
  publicHoliday: '#6366f1',
  unknown: '#d1d5db',
};

const ABSENCE_LABELS: Record<string, string> = {
  present: 'Present',
  absentWithPermission: 'Absent w/ permission',
  absentNoPermission: 'Absent no permission',
  annualVacation: 'Annual vacation',
  sickLeave: 'Sick leave',
  weekend: 'Weekend',
  publicHoliday: 'Public holiday',
  unknown: 'Unknown',
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start: isoDate(start), end: isoDate(end) };
}

export function HrDashboardClient({
  initialStats,
  departments,
  occupations,
  sections,
  contractStats,
}: Props) {
  const { start: defStart, end: defEnd } = defaultRange();
  const [startDate, setStartDate] = useState<string>(defStart);
  const [endDate, setEndDate] = useState<string>(defEnd);
  const [occupation, setOccupation] = useState<string>('__all__');
  const [section, setSection] = useState<string>('__all__');
  const [departmentId, setDepartmentId] = useState<string>('__all__');
  const [groupBy, setGroupBy] = useState<HrDashboardGroupBy>('occupation');
  const [stats, setStats] = useState<HrDashboardResult>(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('start', startDate);
      params.set('end', endDate);
      params.set('groupBy', groupBy);
      if (occupation !== '__all__') params.set('occupation', occupation);
      if (section !== '__all__') params.set('section', section);
      if (departmentId !== '__all__') params.set('departmentId', departmentId);
      const res = await fetch(`/api/hr/dashboard?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as HrDashboardResult;
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, occupation, section, departmentId, groupBy]);

  useEffect(() => {
    // Re-fetch whenever any filter changes (except on first mount, where
    // initialStats already reflects the default window).
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupation, section, departmentId, groupBy]);

  const onApply = () => {
    fetchStats();
  };

  const absenceData = useMemo(() => {
    return Object.entries(stats.absenceMix)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        key,
        name: ABSENCE_LABELS[key] ?? key,
        value,
        color: ABSENCE_COLORS[key] ?? '#9ca3af',
      }));
  }, [stats.absenceMix]);

  const groupChartData = useMemo(() => {
    return stats.groups.slice(0, 15).map((g) => ({
      name: g.label.length > 18 ? `${g.label.slice(0, 16)}…` : g.label,
      regular: Number(g.regularHours.toFixed(1)),
      overtime: Number(g.overtimeHours.toFixed(1)),
      headcount: g.headcount,
    }));
  }, [stats.groups]);

  const trendChartData = useMemo(() => {
    return stats.trend.map((t) => ({
      date: t.date.slice(5), // MM-DD
      regular: Number(t.regularHours.toFixed(1)),
      overtime: Number(t.overtimeHours.toFixed(1)),
    }));
  }, [stats.trend]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Gradient header */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Working hours, attendance mix, and labour utilisation across the
              workforce — live from the attendance sync.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300 bg-white/5 rounded-full px-3 py-1 backdrop-blur-sm border border-white/10">
              <CalendarDays className="h-3 w-3" />
              {startDate} → {endDate}
              <span className="text-slate-500">·</span>
              {stats.totals.daysCounted} day window
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Sticky filter bar */}
      <Card className="sticky top-0 z-10 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label htmlFor="start" className="text-xs">
                Start
              </Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end" className="text-xs">
                End
              </Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Occupation</Label>
              <Select value={occupation} onValueChange={setOccupation}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All occupations</SelectItem>
                  {occupations.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Section</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All sections</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Group by</Label>
              <Select
                value={groupBy}
                onValueChange={(v) => setGroupBy(v as HrDashboardGroupBy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="occupation">Occupation</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="none">No grouping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={onApply} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply date range
            </Button>
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI cards — hero row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Headcount
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums">{stats.totals.headcount}</div>
            <div className="text-xs text-muted-foreground mt-1">
              with attendance in window
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Regular hours
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {stats.totals.regularHours.toFixed(1)}
              <span className="text-lg text-muted-foreground font-medium ml-1">h</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Overtime hours
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums text-blue-700">
              {stats.totals.overtimeHours.toFixed(1)}
              <span className="text-lg text-blue-500 font-medium ml-1">h</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 hover:shadow-md transition-shadow">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 to-indigo-600" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Total hours
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {stats.totals.totalHours.toFixed(1)}
              <span className="text-lg text-muted-foreground font-medium ml-1">h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-100 bg-gradient-to-br from-green-50/50 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Present days</div>
              <div className="text-2xl font-bold tabular-nums text-green-800">
                {stats.totals.presentDays}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100 bg-gradient-to-br from-red-50/50 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Absent days</div>
              <div className="text-2xl font-bold tabular-nums text-red-800">
                {stats.totals.absentDays}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Vacation days</div>
              <div className="text-2xl font-bold tabular-nums text-blue-800">
                {stats.totals.vacationDays}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sick days</div>
              <div className="text-2xl font-bold tabular-nums text-purple-800">
                {stats.totals.sickDays}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group breakdown + absence mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Hours by{' '}
              {groupBy === 'none'
                ? 'total'
                : groupBy === 'occupation'
                ? 'occupation'
                : groupBy === 'section'
                ? 'section'
                : 'department'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupChartData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">
                No attendance records in this window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={groupChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-30}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="regular"
                    stackId="h"
                    fill="#10b981"
                    name="Regular"
                  />
                  <Bar
                    dataKey="overtime"
                    stackId="h"
                    fill="#3b82f6"
                    name="Overtime"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Attendance mix</CardTitle>
          </CardHeader>
          <CardContent>
            {absenceData.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">
                No records.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={absenceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    dataKey="value"
                    nameKey="name"
                    label={(entry) => `${entry.value}`}
                  >
                    {absenceData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {absenceData.map((a) => (
                <div key={a.key} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: a.color }}
                  />
                  {a.name}: <strong>{a.value}</strong>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily hours trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendChartData.length === 0 ? (
            <div className="text-sm text-muted-foreground py-12 text-center">
              No attendance records in this window.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="regular"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Regular"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="overtime"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Overtime"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Group table */}
      {stats.groups.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Group breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2">Group</th>
                    <th className="text-right py-2 px-2">Headcount</th>
                    <th className="text-right py-2 px-2">Regular (h)</th>
                    <th className="text-right py-2 px-2">Overtime (h)</th>
                    <th className="text-right py-2 px-2">Total (h)</th>
                    <th className="text-right py-2 px-2">Present</th>
                    <th className="text-right py-2 px-2">Absent</th>
                    <th className="text-right py-2 px-2">Vacation</th>
                    <th className="text-right py-2 px-2">Sick</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.groups.map((g) => (
                    <tr key={g.key} className="border-b last:border-0">
                      <td className="py-2 px-2">{g.label}</td>
                      <td className="py-2 px-2 text-right">{g.headcount}</td>
                      <td className="py-2 px-2 text-right">
                        {g.regularHours.toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-right text-blue-700">
                        {g.overtimeHours.toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        {g.totalHours.toFixed(1)}
                      </td>
                      <td className="py-2 px-2 text-right text-green-700">
                        {g.presentDays}
                      </td>
                      <td className="py-2 px-2 text-right text-red-700">
                        {g.absentDays}
                      </td>
                      <td className="py-2 px-2 text-right">{g.vacationDays}</td>
                      <td className="py-2 px-2 text-right">{g.sickDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contracts & Documents widget */}
      {contractStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              Contracts &amp; Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <a href="/hr/contracts" className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Total Active</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{contractStats.totalActive}</p>
                <p className="text-xs text-amber-500 mt-0.5">active contracts</p>
              </a>
              <a href="/hr/contracts?status=ACTIVE" className="rounded-xl border bg-gradient-to-b from-rose-50 to-white border-rose-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Expiring in 7 days</p>
                <p className="text-2xl font-bold text-rose-700 mt-1">{contractStats.expiringIn7}</p>
                <p className="text-xs text-rose-500 mt-0.5">urgent attention</p>
              </a>
              <a href="/hr/contracts?status=ACTIVE" className="rounded-xl border bg-gradient-to-b from-orange-50 to-white border-orange-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Expiring in 30 days</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{contractStats.expiringIn30}</p>
                <p className="text-xs text-orange-500 mt-0.5">plan for renewal</p>
              </a>
              <a href="/hr/contracts?status=EXPIRED" className="rounded-xl border bg-gradient-to-b from-slate-50 to-white border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Expired</p>
                <p className="text-2xl font-bold text-slate-700 mt-1">{contractStats.expired}</p>
                <p className="text-xs text-slate-400 mt-0.5">require renewal</p>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
