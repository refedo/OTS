'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Loader2, AlertOctagon, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

interface DelayedTask {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
  status: string;
  delayDays: number;
  delayStatus: 'critical' | 'warning' | 'minor';
  assignedTo: { id: string; name: string; email: string } | null;
  project: { projectNumber: string; name: string } | null;
  createdBy: { name: string } | null;
}

interface DelayedTasksData {
  tasks: DelayedTask[];
  total: number;
  critical: number;
  warning: number;
  minor: number;
}

export default function DelayedTasksWidget() {
  const [data, setData] = useState<DelayedTasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/delayed-tasks');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load delayed tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            Delayed Tasks
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
            <AlertTriangle className="size-5 text-red-600" />
            Delayed Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  const getDelayIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertOctagon className="size-4 text-red-600" />;
      case 'warning': return <AlertCircle className="size-4 text-amber-600" />;
      default: return <Info className="size-4 text-blue-600" />;
    }
  };

  const getDelayBadgeVariant = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive' as const;
      case 'warning': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-red-700 bg-red-50';
      case 'Medium': return 'text-amber-700 bg-amber-50';
      default: return 'text-blue-700 bg-blue-50';
    }
  };

  return (
    <Link href="/notifications?tab=delayed-tasks">
      <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-red-600">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <AlertTriangle className="size-5 text-red-600" />
              Delayed Tasks
            </span>
            {data.total > 0 && (
              <Badge variant="destructive" className="text-sm">
                {data.total}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.total === 0 ? (
            <div className="text-center py-6">
              <Clock className="size-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-600">All tasks are on track</p>
              <p className="text-xs text-muted-foreground mt-1">No delayed tasks found</p>
            </div>
          ) : (
            <>
              {/* Severity Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 rounded-lg bg-red-50">
                  <AlertOctagon className="size-5 text-red-600 mb-1" />
                  <p className="text-lg font-bold text-red-700">{data.critical}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50">
                  <AlertCircle className="size-5 text-amber-600 mb-1" />
                  <p className="text-lg font-bold text-amber-700">{data.warning}</p>
                  <p className="text-xs text-muted-foreground">Warning</p>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-blue-50">
                  <Info className="size-5 text-blue-600 mb-1" />
                  <p className="text-lg font-bold text-blue-700">{data.minor}</p>
                  <p className="text-xs text-muted-foreground">Minor</p>
                </div>
              </div>

              {/* Recent Delayed Tasks List */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Most Overdue
                </p>
                {data.tasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    {getDelayIcon(task.delayStatus)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getDelayBadgeVariant(task.delayStatus)} className="text-xs">
                          {task.delayDays}d late
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.assignedTo && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.assignedTo.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {data.total > 4 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{data.total - 4} more delayed task{data.total - 4 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t">
                <p className="text-sm text-red-600 font-medium">
                  {data.critical > 0
                    ? `${data.critical} critical task${data.critical !== 1 ? 's' : ''} need immediate attention`
                    : `${data.total} task${data.total !== 1 ? 's' : ''} past due date`}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
