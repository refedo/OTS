'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MEETING_CATEGORIES } from '@/lib/services/meeting.constants';
import MeetingDetailSheet from '@/components/meetings/meeting-detail-sheet';
import MeetingFormSheet from '@/components/meetings/meeting-form-sheet';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  agenda: string | null;
  minutes: string | null;
  decisions: string | null;
  isPrivate: boolean;
  organizerId: string;
  organizer: { id: string; name: string; position: string | null };
  department: { id: string; name: string } | null;
  attendees: { id: string; userId: string; status: string; isRequired: boolean; user: { id: string; name: string; position: string | null } }[];
  tasks: { id: string; taskId: string; notes: string | null; task: { id: string; title: string; status: string; priority: string } }[];
}

// ─── Category colours ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  sales:             { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300' },
  operations:        { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300' },
  project:           { bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-300' },
  management_review: { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-300' },
  hr:                { bg: 'bg-pink-100',    text: 'text-pink-800',    border: 'border-pink-300' },
  quality_safety:    { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300' },
  board:             { bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-300' },
  client:            { bg: 'bg-teal-100',    text: 'text-teal-800',    border: 'border-teal-300' },
  supplier:          { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300' },
  planning:          { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
  other:             { bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300' },
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
}

function getCategoryLabel(category: string, custom: string | null): string {
  if (category === 'other') return custom || 'Other';
  return MEETING_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

// ─── Calendar helpers ──────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const grid: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) grid.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarPageClient() {
  const { toast } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.ok ? r.json() : null).then((me) => {
      if (me) setCurrentUserId(me.id ?? '');
    }).catch(() => {});
  }, []);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(`/api/meetings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&pageSize=200`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(null); };

  const grid = buildCalendarGrid(year, month);

  const meetingsForDay = (day: Date) =>
    meetings.filter((m) => isSameDay(new Date(m.scheduledAt), day));

  const dayMeetings = selectedDay ? meetingsForDay(selectedDay) : [];

  const openDetail = (m: Meeting) => { setSelectedMeeting(m); setDetailOpen(true); };

  const handleEdit = (m: Meeting) => {
    setSelectedMeeting(null);
    setDetailOpen(false);
    setEditingMeeting(m);
    setEditOpen(true);
  };

  const handleDelete = async (meetingId: string) => {
    const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'Meeting cancelled', description: 'The meeting has been removed.' });
      setSelectedMeeting(null);
      setDetailOpen(false);
      fetchMeetings();
    } else {
      toast({ title: 'Error', description: 'Could not delete meeting.', variant: 'destructive' });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 lg:ml-64">
      <div className="container mx-auto p-4 lg:p-8 max-w-7xl max-lg:pt-20">

        {/* Hero */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Meeting Calendar</h1>
          <p className="text-muted-foreground mt-1">Team meetings for {MONTH_NAMES[month]} {year}</p>
        </div>

        {/* Nav bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold w-48 text-center tabular-nums">
              {MONTH_NAMES[month]} {year}
            </h2>
            <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Calendar grid */}
          <div className="flex-1 min-w-0">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <div className="grid grid-cols-7 border-l border-t rounded-lg overflow-hidden">
              {grid.map((day, idx) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[100px] border-r border-b bg-slate-50/60"
                    />
                  );
                }
                const dayMtgs = meetingsForDay(day);
                const isToday = isSameDay(day, today);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[100px] border-r border-b p-1.5 cursor-pointer transition-colors hover:bg-indigo-50/50 ${
                      isSelected ? 'bg-indigo-50 ring-1 ring-indigo-300 ring-inset' : 'bg-white'
                    }`}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                          isToday
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-700'
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {dayMtgs.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {dayMtgs.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {dayMtgs.slice(0, 3).map((m) => {
                        const col = getCategoryColor(m.category);
                        const time = new Date(m.scheduledAt).toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openDetail(m); }}
                            className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate border ${col.bg} ${col.text} ${col.border} hover:opacity-80 transition-opacity`}
                            title={m.subject}
                          >
                            {time} {m.subject}
                          </button>
                        );
                      })}
                      {dayMtgs.length > 3 && (
                        <p className="text-[10px] text-slate-500 pl-1">+{dayMtgs.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-2">
              {MEETING_CATEGORIES.filter((c) => meetings.some((m) => m.category === c.value)).map((c) => {
                const col = getCategoryColor(c.value);
                return (
                  <span key={c.value} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${col.bg} ${col.text} ${col.border}`}>
                    {c.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Day panel — desktop */}
          {selectedDay && (
            <div className="w-72 shrink-0 hidden lg:block">
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50">
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedDay.toLocaleDateString('en-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {dayMeetings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                      <Calendar className="h-8 w-8 opacity-40" />
                      <p className="text-sm">No meetings this day</p>
                    </div>
                  )}
                  {dayMeetings.map((m) => {
                    const col = getCategoryColor(m.category);
                    const start = new Date(m.scheduledAt).toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' });
                    const end = new Date(m.endsAt).toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => openDetail(m)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border mb-1 ${col.bg} ${col.text} ${col.border}`}>
                          {getCategoryLabel(m.category, m.categoryCustom)}
                        </div>
                        <p className="text-sm font-medium text-slate-800 leading-snug">{m.subject}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{start} – {end}</p>
                        {m.location && <p className="text-xs text-slate-400 mt-0.5 truncate">{m.location}</p>}
                        <p className="text-xs text-slate-400 mt-0.5">{m.attendees.length} attendee{m.attendees.length !== 1 ? 's' : ''}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile: day list below grid when day selected */}
        {selectedDay && dayMeetings.length > 0 && (
          <div className="lg:hidden mt-4 rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50">
              <p className="text-sm font-semibold text-slate-800">
                {selectedDay.toLocaleDateString('en-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="divide-y">
              {dayMeetings.map((m) => {
                const col = getCategoryColor(m.category);
                const start = new Date(m.scheduledAt).toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' });
                const end = new Date(m.endsAt).toLocaleTimeString('en-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' });
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openDetail(m)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border mb-1 ${col.bg} ${col.text} ${col.border}`}>
                      {getCategoryLabel(m.category, m.categoryCustom)}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{m.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{start} – {end}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <MeetingDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        meeting={selectedMeeting}
        onEdit={handleEdit}
        onDelete={handleDelete}
        currentUserId={currentUserId}
      />

      {/* Edit sheet */}
      <MeetingFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        meeting={editingMeeting}
        onSuccess={() => { setEditOpen(false); setEditingMeeting(null); fetchMeetings(); }}
      />
    </main>
  );
}
