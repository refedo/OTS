'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Terminal,
  XCircle,
  Zap,
} from 'lucide-react';
import type { EventSeverity } from '@/types/system-events';
import { EventDetailDrawer, type SystemEventDetail } from './EventDetailDrawer';

interface CronJobStatus {
  name: string;
  lastRun: string | null;
  lastStatus: 'success' | 'failed' | 'unknown';
  duration: number | null;
}

interface IntegrationStatus {
  name: string;
  lastSync: string | null;
  lastStatus: 'success' | 'failed' | 'unknown';
  duration: number | null;
}

interface HealthStats {
  todayCount: number;
  totalCount: number;
  errorCount: number;
  criticalCount: number;
  warningCount: number;
  errorRate: number;
}

const CRON_JOBS = [
  'financial-sync',
  'dolibarr-sync',
  'lcr-sync',
  'deadline-reminders',
] as const;

const INTEGRATION_PREFIXES: Record<string, string[]> = {
  'Financial Sync': ['FIN_SYNC_COMPLETED', 'FIN_SYNC_FAILED'],
  'Dolibarr Sync': ['DOLIBARR_PRODUCT_SYNCED', 'DOLIBARR_API_ERROR'],
  'PTS Sync': ['PTS_SYNC_COMPLETED', 'PTS_SYNC_FAILED'],
};

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function StatusIcon({ status }: { status: 'success' | 'failed' | 'unknown' }) {
  if (status === 'success')
    return <CheckCircle2 className="size-4 text-green-500" />;
  if (status === 'failed') return <XCircle className="size-4 text-red-500" />;
  return <Clock className="size-4 text-muted-foreground" />;
}

function StatCard({
  label,
  value,
  colorClass = '',
}: {
  label: string;
  value: number | string;
  colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export function SystemHealthDashboard() {
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [cronJobs, setCronJobs] = useState<CronJobStatus[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [recentErrors, setRecentErrors] = useState<SystemEventDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SystemEventDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchStats(), fetchCronJobs(), fetchIntegrations(), fetchErrors()]);
    setLoading(false);
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/system-events?stats=true&limit=1');
      if (!res.ok) return;
      const data = await res.json();
      const s = data.stats;
      if (!s) return;
      const bySev = (s.bySeverity ?? []) as { severity: EventSeverity; count: number }[];
      const errCount = bySev.find(x => x.severity === 'ERROR')?.count ?? 0;
      const critCount = bySev.find(x => x.severity === 'CRITICAL')?.count ?? 0;
      const warnCount = bySev.find(x => x.severity === 'WARNING')?.count ?? 0;
      setStats({
        todayCount: s.todayCount ?? 0,
        totalCount: s.totalCount ?? 0,
        errorCount: errCount,
        criticalCount: critCount,
        warningCount: warnCount,
        errorRate: s.errorRate ?? 0,
      });
    } catch {
      // ignore
    }
  }

  async function fetchCronJobs() {
    try {
      const res = await fetch(
        '/api/system-events?eventCategory=SYSTEM&limit=100'
      );
      if (!res.ok) return;
      const data = await res.json();
      const events = (data.events ?? []) as SystemEventDetail[];

      const jobMap = new Map<string, CronJobStatus>();
      for (const job of CRON_JOBS) {
        jobMap.set(job, { name: job, lastRun: null, lastStatus: 'unknown', duration: null });
      }

      for (const ev of events) {
        const meta = ev.details as Record<string, unknown> | null;
        const jobName = (meta?.cronJob as string) ?? '';
        if (!jobName) continue;

        const existing = jobMap.get(jobName);
        if (existing && existing.lastRun == null) {
          jobMap.set(jobName, {
            name: jobName,
            lastRun: ev.createdAt,
            lastStatus: ev.eventType === 'SYS_CRON_FAILED' ? 'failed' : 'success',
            duration: ev.duration,
          });
        }
      }
      setCronJobs(Array.from(jobMap.values()));
    } catch {
      // ignore
    }
  }

  async function fetchIntegrations() {
    try {
      const res = await fetch(
        '/api/system-events?limit=200'
      );
      if (!res.ok) return;
      const data = await res.json();
      const events = (data.events ?? []) as SystemEventDetail[];

      const result: IntegrationStatus[] = Object.entries(INTEGRATION_PREFIXES).map(
        ([name, types]) => {
          const match = events.find(e => types.includes(e.eventType));
          if (!match) {
            return { name, lastSync: null, lastStatus: 'unknown' as const, duration: null };
          }
          const failed = types.some(t => t.includes('FAILED') || t.includes('ERROR'));
          const isFailed = failed && match.eventType.includes('FAILED') || match.eventType.includes('ERROR');
          return {
            name,
            lastSync: match.createdAt,
            lastStatus: (isFailed ? 'failed' : 'success') as 'success' | 'failed',
            duration: match.duration,
          };
        }
      );
      setIntegrations(result);
    } catch {
      // ignore
    }
  }

  async function fetchErrors() {
    try {
      const params = new URLSearchParams({
        severity: 'ERROR',
        limit: '5',
      });
      const res = await fetch(`/api/system-events?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setRecentErrors(data.events ?? []);
    } catch {
      // ignore
    }
  }

  const severityBadge: Record<EventSeverity, string> = {
    INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    WARNING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    ERROR: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    CRITICAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5">
                <Skeleton className="h-9 w-16 mb-1.5" />
                <Skeleton className="h-3.5 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Events" value={stats?.totalCount ?? 0} />
          <StatCard
            label="Today"
            value={stats?.todayCount ?? 0}
            colorClass="text-blue-600"
          />
          <StatCard
            label="Critical"
            value={stats?.criticalCount ?? 0}
            colorClass="text-purple-600"
          />
          <StatCard
            label="Errors"
            value={stats?.errorCount ?? 0}
            colorClass="text-red-600"
          />
          <StatCard
            label="Warnings"
            value={stats?.warningCount ?? 0}
            colorClass="text-yellow-600"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cron Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="size-4" />
              Cron Jobs
            </CardTitle>
            <CardDescription>Last execution status per job</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Job
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Last Run
                  </th>
                  <th className="text-right p-3 font-medium text-muted-foreground">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-3">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="p-3 text-right">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </td>
                      </tr>
                    ))
                  : cronJobs.map(job => (
                      <tr key={job.name} className="border-b last:border-0">
                        <td className="p-3">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {job.name}
                          </code>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={job.lastStatus} />
                            <span className="text-xs capitalize">
                              {job.lastStatus}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {job.lastRun ? formatRelative(job.lastRun) : '—'}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground text-right">
                          {formatDuration(job.duration)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Integration Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4" />
              Integration Sync Health
            </CardTitle>
            <CardDescription>Last sync status per integration</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Integration
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Last Sync
                  </th>
                  <th className="text-right p-3 font-medium text-muted-foreground">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-3">
                          <Skeleton className="h-4 w-28" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-16" />
                        </td>
                        <td className="p-3">
                          <Skeleton className="h-4 w-20" />
                        </td>
                        <td className="p-3 text-right">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </td>
                      </tr>
                    ))
                  : integrations.map(intg => (
                      <tr key={intg.name} className="border-b last:border-0">
                        <td className="p-3 font-medium">{intg.name}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon status={intg.lastStatus} />
                            <span className="text-xs capitalize">
                              {intg.lastStatus}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {intg.lastSync ? formatRelative(intg.lastSync) : '—'}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground text-right">
                          {formatDuration(intg.duration)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="size-4 text-red-500" />
            Recent Errors
          </CardTitle>
          <CardDescription>Last 5 ERROR-level events across all categories</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-4 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentErrors.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <CheckCircle2 className="size-10 mx-auto mb-2 text-green-500 opacity-60" />
              No recent errors — system looks healthy
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Severity
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Category
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Message
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentErrors.map(ev => (
                  <tr
                    key={ev.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelected(ev);
                      setDrawerOpen(true);
                    }}
                  >
                    <td className="p-3">
                      <Badge
                        className={
                          severityBadge[ev.severity] ??
                          'bg-gray-100 text-gray-700'
                        }
                      >
                        {ev.severity}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted-foreground">
                        {ev.eventCategory ?? ev.category}
                      </span>
                    </td>
                    <td className="p-3 max-w-sm">
                      <p className="truncate font-medium">{ev.title}</p>
                      {ev.entityType && (
                        <p className="text-xs text-muted-foreground">
                          {ev.entityType}
                          {ev.entityName ? ` · ${ev.entityName}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatRelative(ev.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <EventDetailDrawer
        event={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
