'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Loader2, AlertCircle, Clock } from 'lucide-react';

interface RecentItem {
  id: string;
  entityType: string;
  entityId: string;
  workflowName: string;
  status: string;
  initiatedByName: string;
  createdAt: string;
  currentStepName: string | null;
  currentApprovers: string[];
}

interface SummaryData {
  pendingAction: number;
  mySubmissions: { inProgress: number; approved: number; rejected: number };
  recentItems: RecentItem[];
}

function statusBadge(status: string) {
  switch (status) {
    case 'APPROVED':    return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Approved</Badge>;
    case 'REJECTED':    return <Badge className="text-xs bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">Rejected</Badge>;
    case 'IN_PROGRESS': return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">In Progress</Badge>;
    case 'CANCELLED':   return <Badge className="text-xs bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100">Cancelled</Badge>;
    default:            return <Badge className="text-xs bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-100">{status}</Badge>;
  }
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function ApprovalStatusWidget() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/dashboard/approvals/summary');
        if (!res.ok) throw new Error('Failed');
        setData(await res.json());
        setError(null);
      } catch {
        setError('Failed to load approval data');
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-4 text-violet-600" />
            My Approvals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-4 text-violet-600" />
            My Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error ?? 'No data'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full hover:shadow-lg transition-all border-l-4 border-l-violet-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="size-4 text-violet-600" />
          My Approvals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Pending action */}
        <Link href="/workflow/my-approvals">
          <div className={`rounded-lg p-3 transition-colors cursor-pointer ${
            data.pendingAction > 0
              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 hover:bg-amber-100'
              : 'bg-slate-50 dark:bg-slate-900/30 border border-slate-200 hover:bg-slate-100'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {data.pendingAction > 0
                  ? <AlertCircle className="size-4 text-amber-600 shrink-0" />
                  : <Clock className="size-4 text-slate-400 shrink-0" />
                }
                <p className="text-xs text-muted-foreground">Pending your action</p>
              </div>
              <p className={`text-2xl font-bold ${data.pendingAction > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600'}`}>
                {data.pendingAction}
              </p>
            </div>
          </div>
        </Link>

        {/* My submissions summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">In Progress</p>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{data.mySubmissions.inProgress}</p>
          </div>
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/20 p-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Approved</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{data.mySubmissions.approved}</p>
          </div>
          <div className="rounded-md bg-rose-50 dark:bg-rose-950/20 p-2 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Rejected</p>
            <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{data.mySubmissions.rejected}</p>
          </div>
        </div>

        {/* Recent items */}
        {data.recentItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent</p>
            {data.recentItems.map(item => (
              <Link key={item.id} href="/workflow/approvals">
                <div className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{item.workflowName}</p>
                    <p className="text-xs text-slate-400">{item.entityType} · {relativeDate(item.createdAt)}</p>
                  </div>
                  {statusBadge(item.status)}
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link href="/workflow/approvals" className="block">
          <p className="text-xs text-violet-600 hover:underline text-right">View all approvals →</p>
        </Link>
      </CardContent>
    </Card>
  );
}
