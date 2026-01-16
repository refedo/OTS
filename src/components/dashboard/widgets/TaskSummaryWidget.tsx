'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck, AlertCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface TaskSummaryData {
  total: number;
  myTasks: number;
  overdue: number;
  dueToday: number;
  completed: number;
  highPriority: number;
}

export default function TaskSummaryWidget() {
  const [data, setData] = useState<TaskSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/tasks/summary');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load task data');
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
            <ClipboardCheck className="size-5 text-orange-600" />
            Tasks Overview
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
            <ClipboardCheck className="size-5 text-orange-600" />
            Tasks Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href="/tasks">
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-orange-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="size-5 text-orange-600" />
            Tasks Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">My Tasks</p>
              <p className="text-3xl font-bold">{data.myTasks}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">High Priority</p>
              <p className="text-3xl font-bold text-red-600">{data.highPriority}</p>
            </div>
          </div>

          {/* Status Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t">
            <div className="flex flex-col items-center p-2 rounded-lg bg-red-50">
              <AlertCircle className="size-5 text-red-600 mb-1" />
              <p className="text-lg font-bold text-red-700">{data.overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-yellow-50">
              <Clock className="size-5 text-yellow-600 mb-1" />
              <p className="text-lg font-bold text-yellow-700">{data.dueToday}</p>
              <p className="text-xs text-muted-foreground">Due Today</p>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-green-50">
              <CheckCircle2 className="size-5 text-green-600 mb-1" />
              <p className="text-lg font-bold text-green-700">{data.completed}</p>
              <p className="text-xs text-muted-foreground">Done (30d)</p>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              {data.overdue > 0 ? (
                <span className="text-red-600 font-medium">
                  {data.overdue} task{data.overdue !== 1 ? 's' : ''} need immediate attention
                </span>
              ) : (
                <span className="text-green-600 font-medium">
                  All tasks on track
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
