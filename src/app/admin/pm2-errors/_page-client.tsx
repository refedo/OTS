'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate, formatDateTime } from '@/lib/format';

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

interface ErrorStats {
  total: number;
  today: number;
  critical: number;
  error: number;
  warning: number;
}

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

export default function PM2ErrorsPage() {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchErrors();
    fetchStats();
  }, [page]);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', ((page - 1) * limit).toString());
      params.set('category', 'SYSTEM');
      
      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Filter for error-related events
        const errorEvents = (data.events || []).filter((e: SystemError) => 
          e.severity === 'ERROR' || 
          e.severity === 'CRITICAL' || 
          e.severity === 'WARNING' ||
          e.eventType.includes('ERROR') ||
          e.eventType.includes('FAILED')
        );
        setErrors(errorEvents);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredErrors = errors.filter(error => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      error.title.toLowerCase().includes(query) ||
      error.eventType.toLowerCase().includes(query) ||
      error.description?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(total / limit);

  const formatErrorTime = (dateStr: string) => {
    return formatDateTime(dateStr);
  };

  const getStackTrace = (error: SystemError): string | null => {
    const metadata = error.metadata as Record<string, unknown> | null;
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
            Monitor system errors, API failures, and PM2 process issues
          </p>
        </div>
        <Button onClick={() => { fetchErrors(); fetchStats(); }}>
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
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-600">{stats?.warning || 0}</div>
            <p className="text-sm text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
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

      {/* Errors Table */}
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
                    <TableHead className="w-[80px]"></TableHead>
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
                          {formatErrorTime(error.createdAt)}
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

              {/* Pagination */}
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

      {/* Error Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedError && SEVERITY_ICONS[selectedError.severity]}
              Error Details
            </DialogTitle>
            <DialogDescription>
              Full details of this error event
            </DialogDescription>
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
                  <div className="mt-1">{formatErrorTime(selectedError.createdAt)}</div>
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
    </div>
  );
}
