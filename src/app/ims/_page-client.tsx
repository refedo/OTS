'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  CalendarX,
  GitPullRequest,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Plus,
  ClipboardList,
  BookOpen,
  CheckSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClauseCoverage = {
  standard: string;
  totalClauses: number;
  mappedClauses: number;
  percentage: number;
};

type RecentActivity = {
  id: string;
  documentNumber: string;
  title: string;
  status: string;
  updatedAt: string;
  createdAt: string;
};

type DashboardData = {
  totalDocuments: number;
  byStatus: Record<string, number>;
  overdueReviews: number;
  pendingDCRs: number;
  unacknowledgedDistributions: number;
  clauseCoverage: ClauseCoverage[];
  recentActivity: RecentActivity[];
};

type RiskDashboardData = {
  totalRisks: number;
  totalOpportunities: number;
  byRating: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  overdueReviews: number;
  overdueTreatments: number;
  recentActivity: Array<{
    id: string;
    riskNumber: string;
    title: string;
    type: string;
    currentRiskRating: string;
    status: string;
    updatedAt: string;
  }>;
  topRisks: Array<{
    id: string;
    riskNumber: string;
    title: string;
    type: string;
    currentRiskRating: string;
    status: string;
    updatedAt: string;
  }>;
};

type OverdueDoc = {
  id: string;
  documentNumber: string;
  title: string;
  department: { id: string; name: string } | null;
  nextReviewDate: string | null;
  overdueDays: number | null;
  status: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT:        { label: 'Draft',        className: 'bg-gray-100 text-gray-700 border-gray-200' },
    UNDER_REVIEW: { label: 'Under Review', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    APPROVED:     { label: 'Approved',     className: 'bg-green-100 text-green-700 border-green-200' },
    OBSOLETE:     { label: 'Obsolete',     className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const cfg = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

function RiskRatingBadge({ rating }: { rating: string }) {
  const map: Record<string, { label: string; className: string }> = {
    LOW:      { label: 'Low',      className: 'bg-green-100 text-green-700 border-green-200' },
    MEDIUM:   { label: 'Medium',   className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    HIGH:     { label: 'High',     className: 'bg-orange-100 text-orange-700 border-orange-200' },
    CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  const cfg = map[rating] ?? { label: rating, className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return (
    <Badge variant="outline" className={cn('text-xs font-semibold', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border shadow-sm">
          <CardContent className="p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-12 mb-1" />
            <Skeleton className="h-3 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded" />
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  highlight?: boolean;
  highlightColor?: string;
}

function KpiCard({ label, value, sub, icon, highlight, highlightColor }: KpiCardProps) {
  return (
    <Card className={cn(
      'border shadow-sm transition-shadow hover:shadow-md',
      highlight && highlightColor ? highlightColor : '',
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {label}
            </p>
            <p className={cn(
              'text-3xl font-bold',
              highlight && value !== 0 ? 'text-red-600' : 'text-foreground',
            )}>
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            )}
          </div>
          <div className="ml-3 flex-shrink-0">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImsDashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [riskDashboard, setRiskDashboard] = useState<RiskDashboardData | null>(null);
  const [overdueDocs, setOverdueDocs] = useState<OverdueDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [dashRes, riskRes, overdueRes] = await Promise.all([
        fetch('/api/ims/dashboard'),
        fetch('/api/ims/risks/dashboard'),
        fetch('/api/ims/documents?overdue=true&status=APPROVED'),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json() as DashboardData;
        setDashboard(data);
      }
      if (riskRes.ok) {
        const data = await riskRes.json() as RiskDashboardData;
        setRiskDashboard(data);
      }
      if (overdueRes.ok) {
        const data = await overdueRes.json() as OverdueDoc[];
        setOverdueDocs(Array.isArray(data) ? data.slice(0, 8) : []);
      }
    } catch {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Standard display config ─────────────────────────────────────────────

  const standardConfig: Record<string, { label: string; short: string; color: string; barClass: string }> = {
    ISO_9001:  { label: 'ISO 9001:2015',  short: 'Quality',            color: 'text-green-700',  barClass: '[&>div]:bg-green-500' },
    ISO_14001: { label: 'ISO 14001:2015', short: 'Environmental',      color: 'text-blue-700',   barClass: '[&>div]:bg-blue-500' },
    ISO_45001: { label: 'ISO 45001:2018', short: 'OH&S',               color: 'text-purple-700', barClass: '[&>div]:bg-purple-500' },
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.1),_transparent_60%)]" />
        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
                <ShieldCheck className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    Integrated Management System
                  </h1>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold px-2 py-0.5">
                    IMS Active
                  </Badge>
                </div>
                <p className="text-slate-400 text-sm md:text-base font-medium tracking-widest uppercase">
                  ISO 9001 · ISO 14001 · ISO 45001
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 md:px-10 space-y-8 max-w-screen-2xl mx-auto">

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── KPI Strip ── */}
        {loading ? (
          <KpiSkeleton />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Documents"
              value={dashboard?.totalDocuments ?? 0}
              sub={`${dashboard?.byStatus?.APPROVED ?? 0} approved`}
              icon={
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              }
            />
            <KpiCard
              label="Overdue Reviews"
              value={dashboard?.overdueReviews ?? 0}
              sub={dashboard?.overdueReviews === 0 ? 'All up to date' : 'Require attention'}
              icon={
                <div className={cn(
                  'p-2.5 rounded-xl border',
                  (dashboard?.overdueReviews ?? 0) > 0
                    ? 'bg-red-50 border-red-100'
                    : 'bg-gray-50 border-gray-100',
                )}>
                  <CalendarX className={cn(
                    'h-5 w-5',
                    (dashboard?.overdueReviews ?? 0) > 0 ? 'text-red-600' : 'text-gray-400',
                  )} />
                </div>
              }
              highlight={(dashboard?.overdueReviews ?? 0) > 0}
            />
            <KpiCard
              label="Pending DCRs"
              value={dashboard?.pendingDCRs ?? 0}
              sub="Awaiting action"
              icon={
                <div className={cn(
                  'p-2.5 rounded-xl border',
                  (dashboard?.pendingDCRs ?? 0) > 0
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-gray-50 border-gray-100',
                )}>
                  <GitPullRequest className={cn(
                    'h-5 w-5',
                    (dashboard?.pendingDCRs ?? 0) > 0 ? 'text-amber-600' : 'text-gray-400',
                  )} />
                </div>
              }
            />
            <KpiCard
              label="Open Risks"
              value={riskDashboard?.totalRisks ?? 0}
              sub={`${riskDashboard?.byRating?.CRITICAL ?? 0} critical`}
              icon={
                <div className={cn(
                  'p-2.5 rounded-xl border',
                  (riskDashboard?.byRating?.CRITICAL ?? 0) > 0
                    ? 'bg-orange-50 border-orange-100'
                    : 'bg-gray-50 border-gray-100',
                )}>
                  <AlertTriangle className={cn(
                    'h-5 w-5',
                    (riskDashboard?.byRating?.CRITICAL ?? 0) > 0 ? 'text-orange-600' : 'text-gray-400',
                  )} />
                </div>
              }
            />
          </div>
        )}

        {/* ── Clause Coverage ── */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-500" />
              Clause Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-2.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              (dashboard?.clauseCoverage ?? [] as ClauseCoverage[]).map((cov: ClauseCoverage) => {
                const cfg = standardConfig[cov.standard];
                if (!cfg) return null;
                return (
                  <div key={cov.standard} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-semibold', cfg.color)}>{cfg.label}</span>
                        <span className="text-muted-foreground text-xs">— {cfg.short}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{cov.mappedClauses}/{cov.totalClauses} clauses</span>
                        <span className={cn(
                          'font-bold text-sm',
                          cov.percentage >= 80 ? 'text-green-600' :
                          cov.percentage >= 50 ? 'text-amber-600' : 'text-red-600',
                        )}>
                          {cov.percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={cov.percentage}
                      className={cn('h-2.5 bg-gray-100', cfg.barClass)}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* ── Two-column content ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Left column ── */}
          <div className="space-y-6">

            {/* Overdue Reviews table */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarX className="h-4 w-4 text-red-500" />
                    Overdue Reviews
                  </CardTitle>
                  <Link href="/ims/documents?overdue=true">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 gap-1">
                      View all <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <TableSkeleton rows={4} />
                ) : overdueDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="p-3 rounded-full bg-green-50 mb-3">
                      <CheckSquare className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-sm font-medium text-green-700">No overdue reviews — great work!</p>
                    <p className="text-xs text-muted-foreground mt-1">All documents are reviewed on schedule.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b">
                          <TableHead className="text-xs font-semibold text-muted-foreground">Doc #</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground">Title</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Department</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground text-right">Overdue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overdueDocs.map((doc: OverdueDoc) => (
                          <TableRow key={doc.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {doc.documentNumber}
                            </TableCell>
                            <TableCell className="text-sm font-medium max-w-[160px] truncate">
                              <Link
                                href={`/ims/documents/${doc.id}`}
                                className="hover:underline text-foreground"
                              >
                                {doc.title}
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                              {doc.department?.name ?? '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs font-semibold">
                                {doc.overdueDays != null ? `${doc.overdueDays}d` : '—'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Approvals */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  My Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  View and action documents awaiting your approval in the workflow queue.
                </p>
                <Link href="/workflow/my-approvals">
                  <Button className="w-full gap-2" variant="outline">
                    <ExternalLink className="h-4 w-4" />
                    Go to My Approvals
                  </Button>
                </Link>
              </CardContent>
            </Card>

          </div>

          {/* ── Right column ── */}
          <div className="space-y-6">

            {/* Risk Overview */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Risk Overview
                  </CardTitle>
                  <Link href="/ims/risks">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 gap-1">
                      Risk Register <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="flex gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 flex-1 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((rating) => {
                      const count = riskDashboard?.byRating[rating] ?? 0;
                      const styles: Record<string, { bg: string; border: string; text: string; dot: string }> = {
                        LOW:      { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  dot: 'bg-green-500' },
                        MEDIUM:   { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-500' },
                        HIGH:     { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', dot: 'bg-orange-500' },
                        CRITICAL: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    dot: 'bg-red-500' },
                      };
                      const s = styles[rating];
                      return (
                        <div
                          key={rating}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 rounded-xl border',
                            s.bg, s.border,
                          )}
                        >
                          <div className={cn('w-2 h-2 rounded-full mb-2', s.dot)} />
                          <span className={cn('text-2xl font-bold', s.text)}>{count}</span>
                          <span className={cn('text-xs font-medium mt-0.5 capitalize', s.text)}>
                            {rating.charAt(0) + rating.slice(1).toLowerCase()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (dashboard?.recentActivity ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
                ) : (
                  <div className="space-y-2">
                    {(dashboard?.recentActivity ?? [] as RecentActivity[]).map((doc: RecentActivity) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-1.5 rounded-lg bg-slate-100 flex-shrink-0">
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/ims/documents/${doc.id}`}
                            className="text-sm font-medium truncate block hover:underline text-foreground"
                          >
                            {doc.title}
                          </Link>
                          <p className="text-xs text-muted-foreground font-mono">{doc.documentNumber}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <StatusBadge status={doc.status} />
                          <span className="text-xs text-muted-foreground">{timeAgo(doc.updatedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/ims/documents/new">
                    <Button variant="outline" className="w-full gap-2 h-10 justify-start text-sm">
                      <Plus className="h-4 w-4 text-blue-500" />
                      New Document
                    </Button>
                  </Link>
                  <Link href="/ims/change-requests/new">
                    <Button variant="outline" className="w-full gap-2 h-10 justify-start text-sm">
                      <GitPullRequest className="h-4 w-4 text-amber-500" />
                      New DCR
                    </Button>
                  </Link>
                  <Link href="/ims/risks">
                    <Button variant="outline" className="w-full gap-2 h-10 justify-start text-sm">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Risk Register
                    </Button>
                  </Link>
                  <Link href="/ims/clause-matrix">
                    <Button variant="outline" className="w-full gap-2 h-10 justify-start text-sm">
                      <BookOpen className="h-4 w-4 text-purple-500" />
                      Clause Matrix
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
