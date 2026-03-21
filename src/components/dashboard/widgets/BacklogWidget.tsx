'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface BacklogItem {
  id: string;
  code: string;
  title: string;
  type: string;
  priority: string;
  status: string;
}

interface BacklogSummaryData {
  total: number;
  active: number;
  blocked: number;
  idea: number;
  underReview: number;
  approved: number;
  planned: number;
  inProgress: number;
  completed: number;
  dropped: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  recent: BacklogItem[];
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-700 bg-red-50 border-red-200',
  HIGH: 'text-orange-700 bg-orange-50 border-orange-200',
  MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
  LOW: 'text-blue-700 bg-blue-50 border-blue-200',
};

const STATUS_LABELS: Record<string, string> = {
  IDEA: 'Idea',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  COMPLETED: 'Completed',
  DROPPED: 'Dropped',
};

export default function BacklogWidget() {
  const [data, setData] = useState<BacklogSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/backlog/summary');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load backlog data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-5 text-violet-600" />
            Product Backlog
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
            <Layers className="size-5 text-violet-600" />
            Product Backlog
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-l-4 border-l-violet-600">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Layers className="size-5 text-violet-600" />
            Product Backlog
          </span>
          <Badge variant="secondary" className="text-sm">
            {data.total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/backlog?status=IN_PROGRESS">
            <div className="flex flex-col items-center p-2 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors cursor-pointer border border-transparent hover:border-violet-200">
              <p className="text-lg font-bold text-violet-700">{data.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </Link>
          <Link href="/backlog?status=BLOCKED">
            <div className="flex flex-col items-center p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border border-transparent hover:border-red-200">
              <p className="text-lg font-bold text-red-700">{data.blocked}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>
          </Link>
          <Link href="/backlog?status=IDEA">
            <div className="flex flex-col items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
              <p className="text-lg font-bold text-gray-700">{data.idea + data.underReview}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </Link>
        </div>

        {/* Priority Breakdown */}
        <div className="space-y-1.5 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">By Priority</p>
          <div className="grid grid-cols-2 gap-1.5">
            {data.critical > 0 && (
              <div className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-medium ${PRIORITY_COLORS.CRITICAL}`}>
                <span>Critical</span>
                <span>{data.critical}</span>
              </div>
            )}
            {data.high > 0 && (
              <div className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-medium ${PRIORITY_COLORS.HIGH}`}>
                <span>High</span>
                <span>{data.high}</span>
              </div>
            )}
            <div className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-medium ${PRIORITY_COLORS.MEDIUM}`}>
              <span>Medium</span>
              <span>{data.medium}</span>
            </div>
            <div className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-medium ${PRIORITY_COLORS.LOW}`}>
              <span>Low</span>
              <span>{data.low}</span>
            </div>
          </div>
        </div>

        {/* Recent Items */}
        {data.recent.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Items</p>
            {data.recent.map((item) => (
              <Link
                key={item.id}
                href={`/backlog/${item.id}`}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
              >
                {(item.priority === 'CRITICAL' || item.priority === 'HIGH') && (
                  <AlertTriangle className="size-3.5 text-orange-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-primary">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">{item.code}</span>
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                  </div>
                </div>
                <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t">
          <Link href="/backlog" className="text-sm text-violet-600 font-medium hover:underline">
            View all {data.total} backlog item{data.total !== 1 ? 's' : ''}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
