'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquareWarning, Loader2, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';

interface IssueItem {
  id: string;
  issueNumber: number;
  title: string;
  priority: string;
  status: string;
  dueDate: string | null;
  department: { name: string } | null;
}

interface WeeklyIssuesSummaryData {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  overdue: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  recent: IssueItem[];
}

const PRIORITY_BADGE: Record<string, string> = {
  Critical: 'text-red-700 bg-red-50 border-red-200',
  High: 'text-orange-700 bg-orange-50 border-orange-200',
  Medium: 'text-amber-700 bg-amber-50 border-amber-200',
  Low: 'text-blue-700 bg-blue-50 border-blue-200',
};

const STATUS_BADGE: Record<string, 'destructive' | 'secondary' | 'outline' | 'default'> = {
  Open: 'destructive',
  'In Progress': 'secondary',
  Resolved: 'outline',
  Closed: 'outline',
};

export default function WeeklyIssuesWidget() {
  const [data, setData] = useState<WeeklyIssuesSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/weekly-issues/summary');
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch {
      setError('Failed to load weekly issues data');
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
            <MessageSquareWarning className="size-5 text-rose-600" />
            Weekly Issues
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
            <MessageSquareWarning className="size-5 text-rose-600" />
            Weekly Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error || 'No data available'}</p>
        </CardContent>
      </Card>
    );
  }

  const activeIssues = data.open + data.inProgress;

  return (
    <Card className="h-full border-l-4 border-l-rose-600">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <MessageSquareWarning className="size-5 text-rose-600" />
            Weekly Issues
          </span>
          {activeIssues > 0 && (
            <Badge variant="destructive" className="text-sm">
              {activeIssues}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeIssues === 0 ? (
          <div className="text-center py-6">
            <MessageSquareWarning className="size-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-600">No open issues</p>
            <p className="text-xs text-muted-foreground mt-1">All issues are resolved</p>
          </div>
        ) : (
          <>
            {/* Status Overview */}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/business-planning/issues?status=Open">
                <div className="flex flex-col items-center p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border border-transparent hover:border-red-200">
                  <p className="text-lg font-bold text-red-700">{data.open}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
              </Link>
              <Link href="/business-planning/issues?status=In+Progress">
                <div className="flex flex-col items-center p-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer border border-transparent hover:border-amber-200">
                  <p className="text-lg font-bold text-amber-700">{data.inProgress}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
              </Link>
            </div>

            {/* Overdue indicator */}
            {data.overdue > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                <Clock className="size-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700 font-medium">
                  {data.overdue} issue{data.overdue !== 1 ? 's' : ''} past due date
                </p>
              </div>
            )}

            {/* Priority Breakdown */}
            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">By Priority</p>
              <div className="grid grid-cols-2 gap-1.5">
                {data.critical > 0 && (
                  <div className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-medium ${PRIORITY_BADGE.Critical}`}>
                    <span>Critical</span>
                    <span>{data.critical}</span>
                  </div>
                )}
                {data.high > 0 && (
                  <div className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-medium ${PRIORITY_BADGE.High}`}>
                    <span>High</span>
                    <span>{data.high}</span>
                  </div>
                )}
                {data.medium > 0 && (
                  <div className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-medium ${PRIORITY_BADGE.Medium}`}>
                    <span>Medium</span>
                    <span>{data.medium}</span>
                  </div>
                )}
                {data.low > 0 && (
                  <div className={`flex items-center justify-between px-2 py-1 rounded border text-xs font-medium ${PRIORITY_BADGE.Low}`}>
                    <span>Low</span>
                    <span>{data.low}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Open Issues */}
            {data.recent.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Open Issues</p>
                {data.recent.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/business-planning/issues/${issue.id}`}
                    className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate group-hover:text-primary">{issue.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">#{issue.issueNumber}</span>
                        <Badge
                          variant={STATUS_BADGE[issue.status] ?? 'outline'}
                          className="text-xs h-4 px-1"
                        >
                          {issue.status}
                        </Badge>
                        {issue.department && (
                          <span className="text-xs text-muted-foreground truncate max-w-[80px]">{issue.department.name}</span>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="pt-2 border-t">
          <Link href="/business-planning/issues" className="text-sm text-rose-600 font-medium hover:underline">
            {data.resolved > 0
              ? `${data.resolved} issue${data.resolved !== 1 ? 's' : ''} resolved this cycle`
              : `View all ${data.total} issue${data.total !== 1 ? 's' : ''}`}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
