'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewDoc = {
  id: string;
  documentNumber: string;
  title: string;
  status: string;
  nextReviewDate: string;
  lastReviewDate: string | null;
  reviewFrequencyDays: number;
  overdueDays: number | null;
  category: { id: string; code: string; name: string } | null;
  owner: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
};

type MonthGroup = {
  month: string; // "YYYY-MM"
  documents: ReviewDoc[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DRAFT:        'bg-gray-100 text-gray-700 border-gray-200',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700 border-blue-200',
    APPROVED:     'bg-green-100 text-green-700 border-green-200',
    OBSOLETE:     'bg-red-100 text-red-700 border-red-200',
    SUPERSEDED:   'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    DRAFT:        'Draft',
    UNDER_REVIEW: 'Under Review',
    APPROVED:     'Approved',
    OBSOLETE:     'Obsolete',
    SUPERSEDED:   'Superseded',
  };
  return map[status] ?? status;
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-36 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocCardProps {
  doc: ReviewDoc;
  onClick: () => void;
}

function DocCard({ doc, onClick }: DocCardProps) {
  const isOverdue = doc.overdueDays != null && doc.overdueDays > 0;
  const days = isOverdue ? doc.overdueDays! : daysUntil(doc.nextReviewDate);
  const isSoon = !isOverdue && days <= 30;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all hover:shadow-md',
        isOverdue
          ? 'bg-red-50 border-red-200 hover:border-red-400 dark:bg-red-950/20 dark:border-red-800'
          : isSoon
            ? 'bg-amber-50 border-amber-200 hover:border-amber-400 dark:bg-amber-950/20 dark:border-amber-800'
            : 'bg-card border-border hover:border-slate-400',
      )}
    >
      {/* Doc number + status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
          {doc.documentNumber}
        </span>
        <Badge
          variant="outline"
          className={cn('text-xs font-medium flex-shrink-0', statusBadgeClass(doc.status))}
        >
          {statusLabel(doc.status)}
        </Badge>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-foreground line-clamp-2 mb-2 leading-snug">
        {doc.title}
      </p>

      {/* Owner */}
      {doc.owner && (
        <p className="text-xs text-muted-foreground mb-2 truncate">
          {doc.owner.name}
        </p>
      )}

      {/* Days indicator */}
      <div className={cn(
        'text-xs font-semibold flex items-center gap-1',
        isOverdue ? 'text-red-600' : isSoon ? 'text-amber-600' : 'text-green-600',
      )}>
        <Clock className="h-3 w-3 flex-shrink-0" />
        {isOverdue
          ? `${days} day${days !== 1 ? 's' : ''} overdue`
          : days === 0
            ? 'Due today'
            : `Due in ${days} day${days !== 1 ? 's' : ''}`}
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImsReviewCalendarClient() {
  const router = useRouter();
  const [groups, setGroups] = useState<MonthGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ims/review-calendar?months=6');
      if (!res.ok) throw new Error('Failed to fetch review calendar');
      const data = await res.json() as MonthGroup[];
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load review calendar. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (!overdueOnly) return groups;
    return groups
      .map((g: MonthGroup) => ({
        ...g,
        documents: g.documents.filter((d: ReviewDoc) => d.overdueDays != null && d.overdueDays > 0),
      }))
      .filter((g: MonthGroup) => g.documents.length > 0);
  }, [groups, overdueOnly]);

  // Summary stats
  const totalDocs = useMemo(
    () => groups.reduce((sum: number, g: MonthGroup) => sum + g.documents.length, 0),
    [groups]
  );
  const overdueDocs = useMemo(
    () =>
      groups.reduce(
        (sum: number, g: MonthGroup) =>
          sum + g.documents.filter((d: ReviewDoc) => d.overdueDays != null && d.overdueDays > 0).length,
        0
      ),
    [groups]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.1),_transparent_60%)]" />
        <div className="relative px-6 py-10 md:px-10 md:py-12">
          <Link href="/ims" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            IMS Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                <CalendarCheck className="h-7 w-7 text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Review Calendar
                  </h1>
                  {!loading && (
                    <Badge className="bg-white/10 text-white border border-white/20 text-xs font-semibold px-2 py-0.5">
                      Next 6 months
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 text-sm font-medium">
                  IMS · Upcoming Document Reviews
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 md:px-10 space-y-6 max-w-screen-2xl mx-auto">

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Summary strip + filter ── */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold text-foreground">{totalDocs}</span>
                <span className="text-muted-foreground">upcoming review{totalDocs !== 1 ? 's' : ''}</span>
              </div>
              {overdueDocs > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="font-semibold text-red-600">{overdueDocs}</span>
                    <span className="text-muted-foreground">overdue</span>
                  </div>
                </>
              )}
            </div>

            {/* Overdue Only toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOverdueOnly((v: boolean) => !v)}
              className={cn(
                'h-9 gap-1.5 text-sm font-medium border',
                overdueOnly
                  ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 hover:text-red-700'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Show overdue only
            </Button>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <CalendarSkeleton />
        ) : filteredGroups.length === 0 && !overdueOnly ? (
          /* Empty state — no reviews scheduled */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-5 rounded-2xl bg-green-50 mb-4 border border-green-100">
              <CalendarCheck className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              No document reviews scheduled in the next 6 months
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              All documents are either up to date or have no review date set.
            </p>
          </div>
        ) : filteredGroups.length === 0 && overdueOnly ? (
          /* Empty state — no overdue */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-5 rounded-2xl bg-green-50 mb-4 border border-green-100">
              <CalendarCheck className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No overdue reviews</h3>
            <p className="text-sm text-muted-foreground">All scheduled reviews are on track.</p>
          </div>
        ) : (
          /* Timeline */
          <div className="space-y-8">
            {filteredGroups.map((group: MonthGroup) => (
              <div key={group.month}>
                {/* Month header */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-base font-bold text-foreground">
                    {formatMonthLabel(group.month)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-medium bg-slate-100 text-slate-600 border-slate-200">
                      {group.documents.length} doc{group.documents.length !== 1 ? 's' : ''}
                    </Badge>
                    {(() => {
                      const overdueInMonth = group.documents.filter(
                        (d: ReviewDoc) => d.overdueDays != null && d.overdueDays > 0
                      ).length;
                      return overdueInMonth > 0 ? (
                        <Badge variant="outline" className="text-xs font-semibold bg-red-100 text-red-700 border-red-200">
                          {overdueInMonth} overdue
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Document cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.documents.map((doc: ReviewDoc) => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      onClick={() => { void router.push(`/ims/documents/${doc.id}`); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
