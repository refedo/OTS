'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Clock,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Zap,
  RotateCcw,
  Database,
  Bell,
  BarChart3,
  Calendar,
  Hash,
} from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  description: string;
  scheduleExpression: string;
  scheduleHuman: string;
  enabled: boolean;
  hasEndpoint: boolean;
  category: 'sync' | 'notifications' | 'analysis';
  enabledEnvVar: string | null;
  intervalEnvVar: string | null;
  intervalValue: string | null;
}

interface TriggerResult {
  success: boolean;
  status: number;
  elapsed: number;
  result: unknown;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  sync: { label: 'Sync', icon: Database, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  notifications: { label: 'Notifications', icon: Bell, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  analysis: { label: 'Analysis', icon: BarChart3, color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export default function CronJobsPageClient() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});
  const [lastResults, setLastResults] = useState<Record<string, TriggerResult & { at: Date }>>({});
  const [canManage, setCanManage] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, permsRes] = await Promise.all([
        fetch('/api/system/cron-jobs'),
        fetch('/api/auth/me'),
      ]);
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs ?? []);
      }
      if (permsRes.ok) {
        const me = await permsRes.json();
        const perms: string[] = me.permissions ?? [];
        setCanManage(me.isAdmin || perms.includes('settings.manage_cron'));
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load cron jobs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleTrigger = async (job: CronJob) => {
    if (!job.hasEndpoint) {
      toast({
        title: 'Not triggerable',
        description: 'This is an internal scheduler-only job and has no HTTP endpoint.',
        variant: 'destructive',
      });
      return;
    }

    setTriggering((prev) => ({ ...prev, [job.id]: true }));
    try {
      const res = await fetch('/api/system/cron-jobs/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data: TriggerResult = await res.json();
      setLastResults((prev) => ({ ...prev, [job.id]: { ...data, at: new Date() } }));

      if (data.success) {
        toast({
          title: `${job.name} triggered`,
          description: `Completed in ${data.elapsed}ms`,
        });
      } else {
        toast({
          title: `${job.name} failed`,
          description: `Server returned HTTP ${data.status}`,
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to trigger job', variant: 'destructive' });
    } finally {
      setTriggering((prev) => ({ ...prev, [job.id]: false }));
    }
  };

  const enabledCount = jobs.filter((j) => j.enabled).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 max-w-5xl max-lg:pt-20 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Clock className="size-8 text-primary" />
              Cron Jobs
            </h1>
            <p className="text-muted-foreground mt-1">
              Scheduled background tasks and their status
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
            <RefreshCw className={cn('size-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Jobs', value: jobs.length, icon: Hash, color: 'text-foreground' },
            { label: 'Enabled', value: enabledCount, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Disabled', value: jobs.length - enabledCount, icon: XCircle, color: 'text-muted-foreground' },
            { label: 'No Endpoint', value: jobs.filter((j) => !j.hasEndpoint).length, icon: AlertTriangle, color: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn('size-4', color)} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                <p className={cn('text-2xl font-bold mt-1', color)}>{loading ? '—' : value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 flex gap-4">
                  <Skeleton className="size-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const catMeta = CATEGORY_META[job.category] ?? CATEGORY_META.sync;
              const CatIcon = catMeta.icon;
              const isTrig = triggering[job.id] ?? false;
              const lastResult = lastResults[job.id];

              return (
                <Card key={job.id} className={cn('transition-all', !job.enabled && 'opacity-60')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg flex-shrink-0', job.enabled ? 'bg-green-100' : 'bg-muted')}>
                        <CatIcon className={cn('size-5', job.enabled ? 'text-green-700' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base">{job.name}</CardTitle>
                          <Badge variant="outline" className={cn('text-xs', catMeta.color)}>
                            {catMeta.label}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              job.enabled
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {job.enabled ? (
                              <><CheckCircle2 className="size-3 mr-1" />Enabled</>
                            ) : (
                              <><XCircle className="size-3 mr-1" />Disabled</>
                            )}
                          </Badge>
                          {!job.hasEndpoint && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              <AlertTriangle className="size-3 mr-1" />Internal only
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">{job.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    {/* Schedule & Config */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50">
                        <Calendar className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-xs text-muted-foreground mb-0.5">Schedule</p>
                          <p>{job.scheduleHuman}</p>
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">{job.scheduleExpression}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50">
                        <Zap className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-xs text-muted-foreground mb-0.5">Configuration</p>
                          {job.enabledEnvVar ? (
                            <p className="font-mono text-xs">
                              {job.enabledEnvVar}
                              {' = '}
                              <span className={job.enabled ? 'text-green-600' : 'text-red-500'}>
                                {job.enabled ? 'true' : 'false/unset'}
                              </span>
                            </p>
                          ) : (
                            <p className="text-muted-foreground text-xs">Always enabled</p>
                          )}
                          {job.intervalEnvVar && (
                            <p className="font-mono text-xs mt-0.5">
                              {job.intervalEnvVar} = {job.intervalValue ?? 'default'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Last trigger result */}
                    {lastResult && (
                      <div className={cn(
                        'flex items-center gap-2 p-2.5 rounded-md text-sm border',
                        lastResult.success
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-red-50 border-red-200 text-red-800',
                      )}>
                        {lastResult.success ? (
                          <CheckCircle2 className="size-4 flex-shrink-0" />
                        ) : (
                          <XCircle className="size-4 flex-shrink-0" />
                        )}
                        <span>
                          Last manual run {lastResult.success ? 'succeeded' : 'failed'} in{' '}
                          <strong>{lastResult.elapsed}ms</strong>
                          {' '}(HTTP {lastResult.status}) at {lastResult.at.toLocaleTimeString()}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant={job.hasEndpoint ? 'default' : 'outline'}
                          disabled={isTrig || !job.hasEndpoint}
                          onClick={() => handleTrigger(job)}
                          className="gap-1.5"
                        >
                          {isTrig ? (
                            <><Loader2 className="size-3.5 animate-spin" />Running…</>
                          ) : (
                            <><Play className="size-3.5" />Run Now</>
                          )}
                        </Button>
                        {!job.hasEndpoint && (
                          <span className="text-xs text-muted-foreground">
                            Internal scheduler — cannot be triggered via HTTP
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw className="size-4" />
              About Cron Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Cron jobs are background tasks that run on a schedule. Some are managed by the internal
              Node-cron scheduler (process-level), while others are triggered by an external cron
              service via authenticated HTTP POST calls.
            </p>
            <p>
              <strong>Enabled / Disabled</strong> status is read from the server environment variables
              at page load time. To change a job&apos;s schedule, edit the corresponding environment variable
              and restart the server.
            </p>
            <p>
              <strong>Run Now</strong> triggers the job&apos;s HTTP endpoint immediately using the server&apos;s{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">CRON_SECRET</code>. Jobs marked
              as &quot;Internal only&quot; run inside the Node process and cannot be triggered via HTTP.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
