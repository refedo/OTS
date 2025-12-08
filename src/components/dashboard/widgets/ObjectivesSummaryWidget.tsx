'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ObjectivesSummaryData {
  total: number;
  achieved: number;
  inProgress: number;
  behindSchedule: number;
  notStarted: number;
  averageProgress: number;
  byCategory: Array<{
    category: string;
    count: number;
  }>;
}

export default function ObjectivesSummaryWidget() {
  const [data, setData] = useState<ObjectivesSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/objectives/summary');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load objectives data');
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
            <Target className="size-5 text-indigo-600" />
            Company Objectives
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
            <Target className="size-5 text-indigo-600" />
            Company Objectives
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href="/business-planning/objectives">
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-indigo-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="size-5 text-indigo-600" />
            Company Objectives
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Objectives</p>
              <p className="text-3xl font-bold">{data.total}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg. Progress</p>
              <p className="text-3xl font-bold text-indigo-600">{data.averageProgress}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-3 border-t">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all" 
                style={{ width: `${data.averageProgress}%` }}
              />
            </div>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col items-center p-2 rounded-lg bg-green-50">
              <p className="text-lg font-bold text-green-700">{data.achieved}</p>
              <p className="text-xs text-muted-foreground text-center">Achieved</p>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-blue-50">
              <p className="text-lg font-bold text-blue-700">{data.inProgress}</p>
              <p className="text-xs text-muted-foreground text-center">On Track</p>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-red-50">
              <p className="text-lg font-bold text-red-700">{data.behindSchedule}</p>
              <p className="text-xs text-muted-foreground text-center">Behind</p>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-bold text-gray-700">{data.notStarted}</p>
              <p className="text-xs text-muted-foreground text-center">Pending</p>
            </div>
          </div>

          {/* Category Breakdown */}
          {data.byCategory && data.byCategory.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <p className="text-sm font-medium">By Category</p>
              <div className="grid grid-cols-2 gap-2">
                {data.byCategory.slice(0, 4).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                    <span className="truncate">{cat.category}</span>
                    <span className="font-semibold ml-2">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
