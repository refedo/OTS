'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Activity,
  FileUp,
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SystemEvent {
  id: string;
  eventType: string;
  category: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
  projectId: string | null;
  createdAt: string;
  user: { id: string; name: string };
  project: { id: string; projectNumber: string; name: string } | null;
}

interface EventStats {
  todayCount: number;
  totalCount: number;
  byCategory: { category: string; count: number }[];
  byType: { eventType: string; count: number }[];
}

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  created: <Plus className="h-4 w-4 text-green-600" />,
  updated: <Edit className="h-4 w-4 text-blue-600" />,
  deleted: <Trash2 className="h-4 w-4 text-red-600" />,
  uploaded: <FileUp className="h-4 w-4 text-purple-600" />,
  synced: <RefreshCw className="h-4 w-4 text-cyan-600" />,
  approved: <CheckCircle className="h-4 w-4 text-green-600" />,
  rejected: <XCircle className="h-4 w-4 text-red-600" />,
  imported: <Database className="h-4 w-4 text-orange-600" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  file: 'bg-purple-100 text-purple-700 border-purple-200',
  record: 'bg-blue-100 text-blue-700 border-blue-200',
  sync: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  production: 'bg-orange-100 text-orange-700 border-orange-200',
  qc: 'bg-green-100 text-green-700 border-green-200',
  project: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  auth: 'bg-gray-100 text-gray-700 border-gray-200',
  system: 'bg-red-100 text-red-700 border-red-200',
};

export default function EventsPage() {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const limit = 20;

  useEffect(() => {
    fetchEvents();
    fetchStats();
  }, [page, categoryFilter, eventTypeFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('offset', ((page - 1) * limit).toString());
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (eventTypeFilter !== 'all') params.set('eventType', eventTypeFilter);

      const response = await fetch(`/api/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/events/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            System Events
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all system activities and changes
          </p>
        </div>
        <Button onClick={() => { fetchEvents(); fetchStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">{stats.todayCount}</div>
              <p className="text-sm text-muted-foreground">Events Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{stats.totalCount}</div>
              <p className="text-sm text-muted-foreground">Total Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">
                {stats.byType.find(t => t.eventType === 'created')?.count || 0}
              </div>
              <p className="text-sm text-muted-foreground">Records Created</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600">
                {stats.byCategory.find(c => c.category === 'file')?.count || 0}
              </div>
              <p className="text-sm text-muted-foreground">Files Uploaded</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="all">All Categories</option>
              <option value="file">Files</option>
              <option value="record">Records</option>
              <option value="sync">Sync</option>
              <option value="production">Production</option>
              <option value="qc">QC</option>
              <option value="project">Project</option>
              <option value="auth">Auth</option>
            </select>
            <select
              value={eventTypeFilter}
              onChange={(e) => { setEventTypeFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 rounded-md border bg-background text-sm"
            >
              <option value="all">All Types</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="uploaded">Uploaded</option>
              <option value="synced">Synced</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>
            Showing {events.length} of {total} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    {EVENT_TYPE_ICONS[event.eventType] || <Activity className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{event.title}</p>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${CATEGORY_COLORS[event.category] || ''}`}
                      >
                        {event.category}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {event.user.name}
                      </span>
                      {event.project && (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {event.project.projectNumber}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(event.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
