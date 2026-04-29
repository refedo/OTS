'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Video,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  RefreshCw,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import MeetingFormSheet from '@/components/meetings/meeting-form-sheet';
import MeetingDetailSheet from '@/components/meetings/meeting-detail-sheet';
import { MEETING_CATEGORIES } from '@/lib/services/meeting.constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Attendee {
  id: string;
  userId: string;
  status: string;
  isRequired: boolean;
  user: { id: string; name: string; position: string | null };
}

interface LinkedTask {
  id: string;
  taskId: string;
  notes: string | null;
  task: { id: string; title: string; status: string; priority: string };
}

interface Meeting {
  id: string;
  category: string;
  categoryCustom: string | null;
  subject: string;
  status: string;
  scheduledAt: string;
  endsAt: string;
  location: string | null;
  meetLink: string | null;
  googleEventId: string | null;
  agenda: string | null;
  minutes: string | null;
  decisions: string | null;
  isPrivate: boolean;
  departmentId: string | null;
  organizerId: string;
  organizer: { id: string; name: string; position: string | null };
  department: { id: string; name: string } | null;
  attendees: Attendee[];
  tasks: LinkedTask[];
  createdAt: string;
}

interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  sales: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  operations: 'bg-blue-100 text-blue-700 border-blue-200',
  project: 'bg-violet-100 text-violetald-700 border-violet-200',
  management_review: 'bg-amber-100 text-amber-700 border-amber-200',
  hr: 'bg-pink-100 text-pink-700 border-pink-200',
  quality_safety: 'bg-orange-100 text-orange-700 border-orange-200',
  board: 'bg-slate-100 text-slate-700 border-slate-200',
  client: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  supplier: 'bg-lime-100 text-lime-700 border-lime-200',
  planning: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: <AlertCircle className="h-3 w-3" /> },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
};

function getCategoryLabel(meeting: Meeting): string {
  if (meeting.category === 'other') return meeting.categoryCustom || 'Other';
  return MEETING_CATEGORIES.find((c) => c.value === meeting.category)?.label ?? meeting.category;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-SA-u-ca-gregory', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: string, end: string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  onSelect,
  onRsvp,
  currentUserId,
}: {
  meeting: Meeting;
  onSelect: (m: Meeting) => void;
  onRsvp: (meetingId: string, status: 'accepted' | 'declined') => void;
  currentUserId: string;
}) {
  const catLabel = getCategoryLabel(meeting);
  const catColor = CATEGORY_COLORS[meeting.category] ?? CATEGORY_COLORS.other;
  const statusCfg = STATUS_CONFIG[meeting.status] ?? STATUS_CONFIG.scheduled;
  const myAttendance = meeting.attendees.find((a) => a.userId === currentUserId);
  const isOrganizer = meeting.organizerId === currentUserId;
  const isPast = new Date(meeting.endsAt) < new Date();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 group"
      style={{ borderLeftColor: meeting.status === 'cancelled' ? '#ef4444' : meeting.status === 'completed' ? '#10b981' : '#3b82f6' }}
      onClick={() => onSelect(meeting)}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={`text-xs border ${catColor}`}>{catLabel}</Badge>
            <Badge className={`text-xs flex items-center gap-1 ${statusCfg.color} border-0`}>
              {statusCfg.icon}{statusCfg.label}
            </Badge>
            {meeting.isPrivate && <Badge variant="outline" className="text-xs text-slate-400">Private</Badge>}
          </div>
          {meeting.meetLink && (
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
            >
              <Video className="h-3.5 w-3.5" />
              Join Meet
            </a>
          )}
        </div>
        <h3 className="font-semibold text-slate-800 text-sm mt-1 leading-snug">{meeting.subject}</h3>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDateTime(meeting.scheduledAt)}
            <span className="text-slate-400">· {formatDuration(meeting.scheduledAt, meeting.endsAt)}</span>
          </span>
          {meeting.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{meeting.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />{meeting.attendees.length} attendees
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Organised by <span className="font-medium text-slate-600">{meeting.organizer.name}</span>
            {meeting.department && <> · {meeting.department.name}</>}
          </p>
          {myAttendance && !isOrganizer && !isPast && meeting.status === 'scheduled' && (
            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
              {myAttendance.status !== 'accepted' && (
                <Button size="sm" variant="outline" className="h-6 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => onRsvp(meeting.id, 'accepted')}>Accept</Button>
              )}
              {myAttendance.status !== 'declined' && (
                <Button size="sm" variant="outline" className="h-6 text-xs text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => onRsvp(meeting.id, 'declined')}>Decline</Button>
              )}
            </div>
          )}
          {myAttendance && myAttendance.status === 'accepted' && !isOrganizer && (
            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">Accepted</Badge>
          )}
          {myAttendance && myAttendance.status === 'declined' && !isOrganizer && (
            <Badge className="text-xs bg-red-100 text-red-700 border-0">Declined</Badge>
          )}
          {isOrganizer && (
            <Badge className="text-xs bg-violet-100 text-violet-700 border-0">Organiser</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const { toast } = useToast();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);
      params.set('pageSize', '100');

      const [meetRes, statsRes, meRes] = await Promise.all([
        fetch(`/api/meetings?${params}`),
        fetch(`/api/meetings?mode=stats&year=${new Date().getFullYear()}`),
        fetch('/api/auth/me'),
      ]);

      if (meetRes.ok) {
        const data = await meetRes.json();
        setMeetings(data.meetings ?? []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setCurrentUserId(me.id ?? '');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load meetings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter, toast]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const handleRsvp = async (meetingId: string, status: 'accepted' | 'declined') => {
    const res = await fetch(`/api/meetings/${meetingId}/attendees`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast({ title: status === 'accepted' ? 'Accepted' : 'Declined', description: 'Your RSVP has been updated.' });
      fetchMeetings();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingMeeting(null);
    fetchMeetings();
  };

  const handleEdit = (meeting: Meeting) => {
    setSelectedMeeting(null);
    setEditingMeeting(meeting);
    setShowForm(true);
  };

  const handleDelete = async (meetingId: string) => {
    const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'Meeting cancelled', description: 'The meeting has been removed.' });
      setSelectedMeeting(null);
      fetchMeetings();
    } else {
      toast({ title: 'Error', description: 'Could not delete meeting.', variant: 'destructive' });
    }
  };

  const filtered = meetings.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.subject.toLowerCase().includes(q) ||
      m.organizer.name.toLowerCase().includes(q) ||
      getCategoryLabel(m).toLowerCase().includes(q)
    );
  });

  const topCategory = stats
    ? Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 m-4 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Meetings</h1>
              <p className="text-violet-100 text-sm mt-0.5">Schedule, track, and report all company meetings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={fetchMeetings}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              className="bg-white text-indigo-700 hover:bg-violet-50 font-semibold"
              onClick={() => { setEditingMeeting(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Schedule Meeting
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 space-y-5">
        {/* KPI Strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label={`Total ${new Date().getFullYear()}`} value={stats.total} sub="meetings scheduled" />
            <KpiCard label="Completed" value={stats.byStatus['completed'] ?? 0} sub="meetings held" />
            <KpiCard label="Scheduled" value={stats.byStatus['scheduled'] ?? 0} sub="upcoming" />
            {topCategory && (
              <KpiCard
                label="Top Category"
                value={topCategory[1]}
                sub={MEETING_CATEGORIES.find((c) => c.value === topCategory[0])?.label ?? topCategory[0]}
              />
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search meetings..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter || 'all'} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-1.5 text-slate-400" />
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {MEETING_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {stats && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
              <BarChart3 className="h-3.5 w-3.5" />
              {filtered.length} of {meetings.length} meetings
            </div>
          )}
          <div className="flex items-center rounded-lg border bg-white overflow-hidden shrink-0">
            <button
              className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              className={`p-2 ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Meeting List */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Calendar className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">No meetings found</p>
            <p className="text-sm mt-1">Schedule your first meeting to get started</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => { setEditingMeeting(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Schedule Meeting
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                onSelect={setSelectedMeeting}
                onRsvp={handleRsvp}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ) : (
          /* Table view */
          <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b">
                <tr>
                  <th className="px-4 py-2.5 text-left">Subject</th>
                  <th className="px-4 py-2.5 text-left">Category</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-left">Date & Time</th>
                  <th className="px-4 py-2.5 text-left">Duration</th>
                  <th className="px-4 py-2.5 text-left">Organiser</th>
                  <th className="px-4 py-2.5 text-left">Attendees</th>
                  <th className="px-4 py-2.5 text-left">Department</th>
                  <th className="px-4 py-2.5 text-left">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((m) => {
                  const catLabel = getCategoryLabel(m);
                  const catColor = CATEGORY_COLORS[m.category] ?? CATEGORY_COLORS.other;
                  const statusCfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.scheduled;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedMeeting(m)}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800 max-w-[220px] truncate">{m.subject}</p>
                        {m.isPrivate && <span className="text-xs text-slate-400">Private</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={`text-xs border ${catColor}`}>{catLabel}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={`text-xs flex items-center gap-1 w-fit ${statusCfg.color} border-0`}>
                          {statusCfg.icon}{statusCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{formatDateTime(m.scheduledAt)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{formatDuration(m.scheduledAt, m.endsAt)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{m.organizer.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />{m.attendees.length}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{m.department?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-[140px] truncate">
                        {m.meetLink ? (
                          <a href={m.meetLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}>
                            <Video className="h-3.5 w-3.5" />Meet
                          </a>
                        ) : m.location ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Sheet */}
      <MeetingFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        meeting={editingMeeting}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Sheet */}
      <MeetingDetailSheet
        meeting={selectedMeeting}
        open={!!selectedMeeting}
        onOpenChange={(o) => { if (!o) setSelectedMeeting(null); }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentUserId={currentUserId}
      />
    </div>
  );
}
