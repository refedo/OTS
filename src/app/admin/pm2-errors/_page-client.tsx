'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  RefreshCw,
  Search,
  Terminal,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Server,
  RotateCcw,
  Flame,
  MemoryStick,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/format';

// ─── types ──────────────────────────────────────────────────────────────────

interface SystemError {
  id: string;
  eventType: string;
  category: string;
  severity: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}

type RestartKind =
  | 'CLEAN_SHUTDOWN'
  | 'CRASH_EXCEPTION'
  | 'CRASH_REJECTION'
  | 'OOM_SUSPECTED'
  | 'UNKNOWN_RESTART'
  | 'FIRST_START';

interface RestartMeta {
  kind: RestartKind;
  prevUptimeSec: number | null;
  prevRssMb: number | null;
  prevMem: { heapUsedMb: number; heapTotalMb: number; rssMb: number } | null;
  exitCode: number | null;
  error: string | null;
  stack: string | null;
  prevStartedAt: string | null;
  prevUpdatedAt: string | null;
}

interface RestartEvent {
  id: string;
  title: string;
  severity: string;
  metadata: RestartMeta | null;
  createdAt: string;
}

interface ErrorStats {
  total: number;
  today: number;
  critical: number;
  error: number;
  warning: number;
}

// ─── constants ──────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CRITICAL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  INFO: <AlertCircle className="size-4 text-blue-500" />,
  WARNING: <AlertTriangle className="size-4 text-yellow-500" />,
  ERROR: <XCircle className="size-4 text-red-500" />,
  CRITICAL: <AlertCircle className="size-4 text-purple-500" />,
};

const RESTART_KIND_CONFIG: Record<
  RestartKind,
  { label: string; color: string; icon: React.ReactNode }
> = {
  CLEAN_SHUTDOWN: {
    label: 'Clean Shutdown',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: <CheckCircle2 className="size-4 text-green-600" />,
  },
  CRASH_EXCEPTION: {
    label: 'Crash — Exception',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: <Flame className="size-4 text-red-600" />,
  },
  CRASH_REJECTION: {
    label: 'Crash — Promise',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: <Flame className="size-4 text-red-600" />,
  },
  OOM_SUSPECTED: {
    label: 'OOM (suspected)',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: <MemoryStick className="size-4 text-purple-600" />,
  },
  UNKNOWN_RESTART: {
    label: 'Unknown',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    icon: <HelpCircle className="size-4 text-yellow-600" />,
  },
  FIRST_START: {
    label: 'First Start',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    icon: <RotateCcw className="size-4 text-gray-500" />,
  },
};

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtUptime(sec: number | null): string {
  if (sec === null) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function PM2ErrorsPage() {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [restarts, setRestarts] = useState<RestartEvent[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [restartsLoading, setRestartsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [restartsTotal, setRestartsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [restartsPage, setRestartsPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const [selectedRestart, setSelectedRestart] = useState<RestartEvent | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const limit = 20;

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        category: 'SYSTEM',
      });
      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        const errorEvents = (data.events || []).filter((e: SystemError) =>
          e.severity === 'ERROR' ||
          e.severity === 'CRITICAL' ||
          e.severity === 'WARNING' ||
          e.eventType.includes('ERROR') ||
          e.eventType.includes('FAILED'),
        );
        setErrors(errorEvents);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchRestarts = useCallback(async () => {
    setRestartsLoading(true);
    try {
      const params = new URLSearchParams({
        eventType: 'PROCESS_RESTART',
        limit: limit.toString(),
        offset: ((restartsPage - 1) * limit).toString(),
      });
      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRestarts(data.events || []);
        setRestartsTotal(data.total || 0);
      }
    } finally {
      setRestartsLoading(false);
    }
  }, [restartsPage]);

  const fetchStats = useCallback(async () => {
    const response = await fetch('/api/events/stats');
    if (response.ok) {
      const data = await response.json();
      const bySeverity = data.bySeverity || [];
      setStats({
        total: data.totalCount || 0,
        today: data.todayCount || 0,
        critical: bySeverity.find((s: { severity: string; count: number }) => s.severity === 'CRITICAL')?.count || 0,
        error: bySeverity.find((s: { severity: string; count: number }) => s.severity === 'ERROR')?.count || 0,
        warning: bySeverity.find((s: { severity: string; count: number }) => s.severity === 'WARNING')?.count || 0,
      });
    }
  }, []);

  useEffect(() => { fetchErrors(); }, [fetchErrors]);
  useEffect(() => { fetchRestarts(); }, [fetchRestarts]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const filteredErrors = errors.filter(error => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      error.title.toLowerCase().includes(q) ||
      error.eventType.toLowerCase().includes(q) ||
      error.description?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(total / limit);
  const restartsTotalPages = Math.ceil(restartsTotal / limit);

  const getStackTrace = (error: SystemError): string | null => {
    const metadata = error.metadata;
    if (metadata?.stack) return String(metadata.stack);
    if (metadata?.error) return String(metadata.error);
    if (error.description) {
      try {
        const parsed = JSON.parse(error.description);
        return parsed.stack || parsed.error || error.description;
      } catch {
        return error.description;
      }
    }
    return null;
  };

  const restartKindOf = (r: RestartEvent): RestartKind =>
    (r.metadata?.kind as RestartKind | undefined) ?? 'UNKNOWN_RESTART';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Server className="size-8 text-red-600" />
            PM2 Errors & System Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor system errors, API failures, and PM2 restart history
          </p>
        </div>
        <Button onClick={() => { fetchErrors(); fetchRestarts(); fetchStats(); }}>
          <RefreshCw className="size-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-blue-600">{stats?.today || 0}</div>
            <p className="text-sm text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-600">{stats?.critical || 0}</div>
            <p className="text-sm text-muted-foreground">Critical</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-600">{stats?.error || 0}</div>
            <p className="text-sm text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-orange-600">{restartsTotal}</div>
            <p className="text-sm text-muted-foreground">Restarts Logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="restarts">
        <TabsList>
          <TabsTrigger value="restarts" className="flex items-center gap-2">
            <RotateCcw className="size-4" />
            Restart History
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <Terminal className="size-4" />
            System Errors
          </TabsTrigger>
        </TabsList>

        {/* ── Restart History ────────────────────────────────────────────── */}
        <TabsContent value="restarts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="size-5" />
                PM2 Restart History
              </CardTitle>
              <CardDescription>
                Every restart is logged with its cause. Check this first when investigating instability.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {restartsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : restarts.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Restart Cause</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="w-[110px]">Prev Uptime</TableHead>
                        <TableHead className="w-[110px]">Prev RSS</TableHead>
                        <TableHead className="w-[180px]">Restarted At</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {restarts.map((r) => {
                        const kind = restartKindOf(r);
                        const cfg = RESTART_KIND_CONFIG[kind];
                        const meta = r.metadata;
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Badge className={cfg.color}>
                                <span className="flex items-center gap-1">
                                  {cfg.icon}
                                  {cfg.label}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate">{r.title}</p>
                              {meta?.error && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {meta.error}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              {fmtUptime(meta?.prevUptimeSec ?? null)}
                            </TableCell>
                            <TableCell className="text-sm font-mono">
                              {meta?.prevMem?.rssMb != null
                                ? `${meta.prevMem.rssMb} MB`
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="size-3 text-muted-foreground" />
                                {formatDateTime(r.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSelectedRestart(r); setShowRestartDialog(true); }}
                              >
                                <Eye className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {restartsTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <div className="text-sm text-muted-foreground">
                        Page {restartsPage} of {restartsTotalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestartsPage(p => Math.max(1, p - 1))}
                          disabled={restartsPage === 1}
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestartsPage(p => Math.min(restartsTotalPages, p + 1))}
                          disabled={restartsPage === restartsTotalPages}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <RotateCcw className="size-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No restart events yet</p>
                  <p className="text-sm">Restart history will appear here after the next PM2 restart</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── System Errors ──────────────────────────────────────────────── */}
        <TabsContent value="errors">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search errors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="size-5" />
                  Error Log
                </CardTitle>
                <CardDescription>
                  Showing {filteredErrors.length} of {total} system events
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                ) : filteredErrors.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Severity</TableHead>
                          <TableHead>Event Type</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="w-[80px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredErrors.map((error) => (
                          <TableRow key={error.id}>
                            <TableCell>
                              <Badge className={SEVERITY_COLORS[error.severity] || 'bg-gray-100'}>
                                <span className="flex items-center gap-1">
                                  {SEVERITY_ICONS[error.severity]}
                                  {error.severity}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {error.eventType}
                              </code>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="font-medium truncate">{error.title}</p>
                              {error.entityType && (
                                <p className="text-xs text-muted-foreground">
                                  {error.entityType}: {error.entityId?.slice(0, 8)}...
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Clock className="size-3 text-muted-foreground" />
                                {formatDateTime(error.createdAt)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setSelectedError(error); setShowDetailDialog(true); }}
                              >
                                <Eye className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="text-sm text-muted-foreground">
                          Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            <ChevronLeft className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="size-12 mx-auto mb-2 opacity-50" />
                    <p>No errors found</p>
                    <p className="text-sm">System is running smoothly</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedError && SEVERITY_ICONS[selectedError.severity]}
              Error Details
            </DialogTitle>
            <DialogDescription>Full details of this error event</DialogDescription>
          </DialogHeader>
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Severity</label>
                  <div className="mt-1">
                    <Badge className={SEVERITY_COLORS[selectedError.severity] || 'bg-gray-100'}>
                      {selectedError.severity}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Event Type</label>
                  <div className="mt-1">
                    <code className="text-sm bg-muted px-2 py-1 rounded">{selectedError.eventType}</code>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time</label>
                  <div className="mt-1">{formatDateTime(selectedError.createdAt)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <div className="mt-1">{selectedError.category}</div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <div className="mt-1 p-3 rounded-lg bg-muted">{selectedError.title}</div>
              </div>
              {getStackTrace(selectedError) && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stack Trace / Details</label>
                  <pre className="mt-1 p-3 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto max-h-[300px]">
                    {getStackTrace(selectedError)}
                  </pre>
                </div>
              )}
              {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Metadata</label>
                  <pre className="mt-1 p-3 rounded-lg bg-muted text-xs overflow-x-auto max-h-[200px]">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restart Detail Dialog */}
      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5" />
              Restart Details
            </DialogTitle>
            <DialogDescription>Full context for this process restart</DialogDescription>
          </DialogHeader>
          {selectedRestart && (() => {
            const kind = restartKindOf(selectedRestart);
            const cfg = RESTART_KIND_CONFIG[kind];
            const meta = selectedRestart.metadata;
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Restart Cause</label>
                    <div className="mt-1">
                      <Badge className={cfg.color}>
                        <span className="flex items-center gap-1">{cfg.icon}{cfg.label}</span>
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Restarted At</label>
                    <div className="mt-1">{formatDateTime(selectedRestart.createdAt)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Previous Uptime</label>
                    <div className="mt-1 font-mono">{fmtUptime(meta?.prevUptimeSec ?? null)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Previous RSS</label>
                    <div className="mt-1 font-mono">
                      {meta?.prevMem
                        ? `${meta.prevMem.rssMb} MB (heap ${meta.prevMem.heapUsedMb}/${meta.prevMem.heapTotalMb} MB)`
                        : '—'}
                    </div>
                  </div>
                  {meta?.prevStartedAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Previous Start</label>
                      <div className="mt-1 text-sm">{formatDateTime(meta.prevStartedAt)}</div>
                    </div>
                  )}
                  {meta?.prevUpdatedAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last State Update</label>
                      <div className="mt-1 text-sm">{formatDateTime(meta.prevUpdatedAt)}</div>
                    </div>
                  )}
                </div>

                {meta?.error && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Error Message</label>
                    <div className="mt-1 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 text-sm">
                      {meta.error}
                    </div>
                  </div>
                )}

                {meta?.stack && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stack Trace</label>
                    <pre className="mt-1 p-3 rounded-lg bg-gray-900 text-gray-100 text-xs overflow-x-auto max-h-[300px]">
                      {meta.stack}
                    </pre>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
