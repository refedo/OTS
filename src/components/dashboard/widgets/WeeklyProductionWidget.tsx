'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

type Period = 'day' | 'week' | 'month';

interface DailyProduction {
  date: string;
  dayName: string;
  totalWeight: number;
  processes: { [key: string]: number };
}

interface WeeklyProductionData {
  dailyProduction: DailyProduction[];
  totalWeightWeek: number;
  averageDailyWeight: number;
  period: Period;
  processBreakdown: Array<{
    process: string;
    weight: number;
  }>;
  topTeams: Array<{
    team: string;
    weight: number;
  }>;
  qcStatus: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

const PERIOD_LABELS: Record<Period, string> = { day: 'Day', week: 'Week', month: 'Month' };

export default function WeeklyProductionWidget() {
  const [data, setData] = useState<WeeklyProductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');

  const fetchData = useCallback(async (p: Period) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/production/weekly?period=${p}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load production data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
    const interval = setInterval(() => fetchData(period), 60000);
    return () => clearInterval(interval);
  }, [period, fetchData]);

  const periodTotalLabel =
    period === 'day' ? 'Total Today' : period === 'week' ? 'Total This Week' : 'Total This Month';
  const avgLabel = period === 'day' ? 'Hourly Average' : 'Daily Average';

  return (
    <Link href="/production/mass-log">
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-emerald-600">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Factory className="size-5 text-emerald-600" />
              Production Trend
            </CardTitle>
            {/* Period selector — stop propagation so Link doesn't navigate */}
            <div
              className="flex rounded-md border overflow-hidden text-xs"
              onClick={(e) => e.preventDefault()}
            >
              {(['day', 'week', 'month'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPeriod(p);
                  }}
                  className={cn(
                    'px-2.5 py-1 font-medium transition-colors',
                    period === p
                      ? 'bg-emerald-600 text-white'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  )}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error || !data ? (
            <p className="text-sm text-destructive">{error || 'No data available'}</p>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{periodTotalLabel}</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {data.totalWeightWeek.toLocaleString()} kg
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{avgLabel}</p>
                  <p className="text-2xl font-bold">{data.averageDailyWeight.toLocaleString()} kg</p>
                </div>
              </div>

              {/* Chart */}
              <div className="pt-3 border-t">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.dailyProduction}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="dayName" tick={{ fontSize: 12 }} stroke="#6b7280" />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Weight']}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalWeight"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Top Processes */}
              {data.processBreakdown && data.processBreakdown.length > 0 && (
                <div className="pt-3 border-t space-y-2">
                  <p className="text-sm font-medium">Top Processes</p>
                  <div className="space-y-1">
                    {data.processBreakdown.slice(0, 3).map((process, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{process.process}</span>
                        <span className="font-semibold">{process.weight.toLocaleString()} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QC Status */}
              <div className="pt-3 border-t">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-yellow-50">
                    <p className="text-lg font-bold text-yellow-700">{data.qcStatus.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending QC</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-green-50">
                    <p className="text-lg font-bold text-green-700">{data.qcStatus.approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-red-50">
                    <p className="text-lg font-bold text-red-700">{data.qcStatus.rejected}</p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
