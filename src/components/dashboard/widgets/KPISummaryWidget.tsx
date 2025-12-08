'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface KPISummaryData {
  companyKPIScore: number;
  redKPIs: number;
  yellowKPIs: number;
  greenKPIs: number;
  totalKPIs: number;
  departmentScores: Array<{
    departmentName: string;
    score: number;
    status: string;
  }>;
}

export default function KPISummaryWidget() {
  const [data, setData] = useState<KPISummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/kpis/summary');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load KPI data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 text-purple-600" />
            KPI Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5 text-purple-600" />
            KPI Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <Link href="/kpis">
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-purple-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="size-5 text-purple-600" />
            KPI Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Score */}
          <div className="flex items-center justify-center">
            <div className={`relative size-32 rounded-full ${getScoreBgColor(data.companyKPIScore)} flex items-center justify-center`}>
              <div className="text-center">
                <p className={`text-4xl font-bold ${getScoreColor(data.companyKPIScore)}`}>
                  {data.companyKPIScore}
                </p>
                <p className="text-xs text-muted-foreground">Company Score</p>
              </div>
            </div>
          </div>

          {/* KPI Status Distribution */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t">
            <div className="flex flex-col items-center p-2 rounded-lg bg-red-50">
              <div className="size-3 rounded-full bg-red-600 mb-1"></div>
              <p className="text-lg font-bold text-red-700">{data.redKPIs}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-yellow-50">
              <div className="size-3 rounded-full bg-yellow-600 mb-1"></div>
              <p className="text-lg font-bold text-yellow-700">{data.yellowKPIs}</p>
              <p className="text-xs text-muted-foreground">Warning</p>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-green-50">
              <div className="size-3 rounded-full bg-green-600 mb-1"></div>
              <p className="text-lg font-bold text-green-700">{data.greenKPIs}</p>
              <p className="text-xs text-muted-foreground">On Track</p>
            </div>
          </div>

          {/* Department Scores (if available) */}
          {data.departmentScores && data.departmentScores.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-sm font-medium">Top Departments</p>
              {data.departmentScores.slice(0, 3).map((dept, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{dept.departmentName}</span>
                  <span className={`font-semibold ${getScoreColor(dept.score)}`}>
                    {dept.score}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              Tracking {data.totalKPIs} KPIs across the organization
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
