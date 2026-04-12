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
import { Loader2, RefreshCw, Users, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import type { HrDashboardResult, HrDashboardGroupBy } from '@/lib/services/hr/hr-dashboard-stats';

type Props = {
  initialStats: HrDashboardResult;
  departments: { id: string; name: string }[];
  occupations: string[];
  sections: string[];
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
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">HR Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Working hours, attendance mix, and labour utilisation across the workforce.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Headcount</div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold mt-1">{stats.totals.headcount}</div>
            <div className="text-[11px] text-muted-foreground">
              with attendance in window
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Regular hours</div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold mt-1">
              {stats.totals.regularHours.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Overtime hours</div>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-semibold mt-1 text-blue-700">
              {stats.totals.overtimeHours.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Total hours</div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold mt-1">
              {stats.totals.totalHours.toFixed(1)}h
            </div>
            <div className="text-[11px] text-muted-foreground">
              {stats.totals.daysCounted} day window
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Present days</div>
            <div className="text-xl font-semibold text-green-700">
              {stats.totals.presentDays}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Absent days</div>
            <div className="text-xl font-semibold text-red-700">
              {stats.totals.absentDays}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Vacation days</div>
            <div className="text-xl font-semibold text-blue-700">
              {stats.totals.vacationDays}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Sick days</div>
            <div className="text-xl font-semibold text-purple-700">
              {stats.totals.sickDays}
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
    </div>
  );
}
