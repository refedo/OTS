'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  FolderOpen,
  HeartPulse,
  Info,
  Loader2,
  RefreshCw,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import {
  SEVERITY_COLORS,
  CATEGORY_COLORS,
} from '@/types/system-events';
import type { EventCategory, EventSeverity } from '@/types/system-events';
import { EventDetailDrawer, type SystemEventDetail } from '@/components/events/EventDetailDrawer';
import { SystemHealthDashboard } from '@/components/events/SystemHealthDashboard';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EventStats {
  todayCount: number;
  totalCount: number;
  bySeverity: { severity: EventSeverity; count: number }[];
  byCategory: { category: EventCategory; count: number }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_CATEGORIES: EventCategory[] = [
  'AUTH', 'PROJECT', 'TASK', 'PRODUCTION', 'QC', 'ENGINEERING',
  'FINANCIAL', 'DOLIBARR', 'PTS', 'BUSINESS', 'NOTIFICATION',
  'USER', 'SYSTEM', 'RISK', 'KNOWLEDGE', 'EXPORT',
];

const ALL_SEVERITIES: EventSeverity[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];

const SEVERITY_ICONS: Record<EventSeverity, React.ReactNode> = {
  INFO: <Info className="size-3.5" />,
  WARNING: <AlertTriangle className="size-3.5" />,
  ERROR: <XCircle className="size-3.5" />,
  CRITICAL: <AlertCircle className="size-3.5" />,
};

const PAGE_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EventsDashboard() {
  // Table state
  const [events, setEvents] = useState<SystemEventDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Stats
  const [stats, setStats] = useState<EventStats | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [correlationFilter, setCorrelationFilter] = useState('');

  // Drawer
  const [selected, setSelected] = useState<SystemEventDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch events
  const fetchEvents = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((currentPage - 1) * PAGE_SIZE),
        stats: 'true',
      });
      if (search) params.set('search', search);
      if (categoryFilter !== 'all') params.set('eventCategory', categoryFilter);
      if (severityFilter !== 'all') params.set('severity', severityFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) {
        // include the whole end day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.set('endDate', end.toISOString());
      }
      if (correlationFilter) params.set('correlationId', correlationFilter);

      const res = await fetch(`/api/system-events?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
        setTotal(data.total ?? 0);
        if (data.stats) setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, severityFilter, startDate, endDate, correlationFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, severityFilter, startDate, endDate, correlationFilter]);

  useEffect(() => {
    fetchEvents(page);
  }, [fetchEvents, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleFilterCorrelation = (id: string) => {
    setCorrelationFilter(id);
  };

  const clearCorrelationFilter = () => {
    setCorrelationFilter('');
  };

  // Stats helpers
  const errorCount =
    stats?.bySeverity.find(s => s.severity === 'ERROR')?.count ?? 0;
  const criticalCount =
    stats?.bySeverity.find(s => s.severity === 'CRITICAL')?.count ?? 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="size-8 text-blue-600" />
            System Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Audit trail, operational intelligence, and system health
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchEvents(page)}
          disabled={loading}
        >
          <RefreshCw className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events" className="gap-1.5">
            <Activity className="size-4" />
            Event Log
          </TabsTrigger>
          <TabsTrigger value="health" className="gap-1.5">
            <HeartPulse className="size-4" />
            System Health
          </TabsTrigger>
        </TabsList>

        {/* ── EVENT LOG TAB ─────────────────────────────────────────────── */}
        <TabsContent value="events" className="space-y-4 mt-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.todayCount ?? 0}
                </div>
                <p className="text-sm text-muted-foreground">Events Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-3xl font-bold">{stats?.totalCount ?? 0}</div>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="pt-5">
                <div className="text-3xl font-bold text-red-600">
                  {errorCount + criticalCount}
                </div>
                <p className="text-sm text-muted-foreground">Errors & Critical</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardContent className="pt-5">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats?.bySeverity.find(s => s.severity === 'WARNING')?.count ?? 0}
                </div>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </CardContent>
            </Card>
          </div>

          {/* Correlation filter banner */}
          {correlationFilter && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
              <Info className="size-4 text-blue-500 shrink-0" />
              <span className="flex-1">
                Filtering by correlation group:{' '}
                <code className="font-mono text-xs">{correlationFilter}</code>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={clearCorrelationFilter}
              >
                Clear
              </Button>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-3 items-center">
                <Filter className="size-4 text-muted-foreground shrink-0" />

                {/* Search */}
                <div className="relative min-w-[180px] flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search events…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="h-9 pl-8 text-sm"
                  />
                </div>

                {/* Category */}
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="all">All Categories</option>
                  {ALL_CATEGORIES.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Severity */}
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="all">All Severities</option>
                  {ALL_SEVERITIES.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Date range */}
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                  placeholder="To"
                />

                {/* Clear filters */}
                {(search ||
                  categoryFilter !== 'all' ||
                  severityFilter !== 'all' ||
                  startDate ||
                  endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => {
                      setSearch('');
                      setCategoryFilter('all');
                      setSeverityFilter('all');
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Events table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Event Log</CardTitle>
              <CardDescription>
                Showing{' '}
                {total === 0
                  ? '0'
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}`}{' '}
                of {total.toLocaleString()} events
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground">
                  <Activity className="size-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No events found</p>
                  <p className="text-sm mt-1">
                    Try adjusting the filters or date range
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left p-3 font-medium text-muted-foreground w-28">
                            Severity
                          </th>
                          <th className="text-left p-3 font-medium text-muted-foreground">
                            Category
                          </th>
                          <th className="text-left p-3 font-medium text-muted-foreground">
                            Event
                          </th>
                          <th className="text-left p-3 font-medium text-muted-foreground">
                            Summary
                          </th>
                          <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">
                            Actor
                          </th>
                          <th className="text-left p-3 font-medium text-muted-foreground hidden xl:table-cell">
                            Project
                          </th>
                          <th className="text-left p-3 font-medium text-muted-foreground">
                            Time
                          </th>
                          <th className="w-10 p-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {events.map(event => {
                          const displayCat = event.eventCategory ?? event.category;
                          return (
                            <tr
                              key={event.id}
                              className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelected(event);
                                setDrawerOpen(true);
                              }}
                            >
                              {/* Severity */}
                              <td className="p-3">
                                <Badge
                                  className={
                                    SEVERITY_COLORS[event.severity] ??
                                    'bg-gray-100 text-gray-700'
                                  }
                                >
                                  <span className="flex items-center gap-1">
                                    {SEVERITY_ICONS[event.severity]}
                                    {event.severity}
                                  </span>
                                </Badge>
                              </td>

                              {/* Category */}
                              <td className="p-3">
                                {displayCat && (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      CATEGORY_COLORS[
                                        displayCat as EventCategory
                                      ] ?? ''
                                    }`}
                                  >
                                    {displayCat}
                                  </Badge>
                                )}
                              </td>

                              {/* Event type */}
                              <td className="p-3">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {event.eventType}
                                </code>
                              </td>

                              {/* Summary */}
                              <td className="p-3 max-w-xs">
                                <p className="truncate font-medium">
                                  {event.title}
                                </p>
                                {event.entityName && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {event.entityType && `${event.entityType} · `}
                                    {event.entityName}
                                  </p>
                                )}
                              </td>

                              {/* Actor */}
                              <td className="p-3 hidden lg:table-cell">
                                {(event.user?.name ?? event.userName) ? (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <User className="size-3 text-muted-foreground" />
                                    <span>
                                      {event.user?.name ?? event.userName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    system
                                  </span>
                                )}
                              </td>

                              {/* Project */}
                              <td className="p-3 hidden xl:table-cell">
                                {event.project || event.projectNumber ? (
                                  <div className="flex items-center gap-1 text-xs">
                                    <FolderOpen className="size-3 text-muted-foreground" />
                                    <span>
                                      {event.project?.projectNumber ??
                                        event.projectNumber}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </td>

                              {/* Time */}
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="size-3" />
                                  {formatDateTime(event.createdAt)}
                                </div>
                              </td>

                              {/* View button */}
                              <td className="p-3">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelected(event);
                                    setDrawerOpen(true);
                                  }}
                                >
                                  <Eye className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages} · {total.toLocaleString()}{' '}
                        total
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          <ChevronLeft className="size-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPage(p => Math.min(totalPages, p + 1))
                          }
                          disabled={page === totalPages}
                        >
                          Next
                          <ChevronRight className="size-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SYSTEM HEALTH TAB ─────────────────────────────────────────── */}
        <TabsContent value="health" className="mt-4">
          <SystemHealthDashboard />
        </TabsContent>
      </Tabs>

      {/* Event detail drawer */}
      <EventDetailDrawer
        event={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onFilterCorrelation={handleFilterCorrelation}
      />
    </div>
  );
}
