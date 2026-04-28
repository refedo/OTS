'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  FileText,
  CheckSquare,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { MEETING_CATEGORIES } from '@/lib/services/meeting.constants';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  agenda: string | null;
  minutes: string | null;
  decisions: string | null;
  isPrivate: boolean;
  organizerId: string;
  organizer: { id: string; name: string; position: string | null };
  department: { id: string; name: string } | null;
  attendees: Attendee[];
  tasks: LinkedTask[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ATTENDEE_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  invited: { label: 'Invited', color: 'bg-slate-100 text-slate-600', icon: null },
  accepted: { label: 'Accepted', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  attended: { label: 'Attended', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  absent: { label: 'Absent', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="h-3 w-3" /> },
};

const TASK_PRIORITY_COLOR: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
};

function getCategoryLabel(meeting: Meeting): string {
  if (meeting.category === 'other') return meeting.categoryCustom || 'Other';
  return MEETING_CATEGORIES.find((c) => c.value === meeting.category)?.label ?? meeting.category;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(start: string, end: string): string {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
}

// ─── Minutes Editor ───────────────────────────────────────────────────────────

function MinutesEditor({ meetingId, initialMinutes, initialDecisions, onSaved }: {
  meetingId: string;
  initialMinutes: string | null;
  initialDecisions: string | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [minutes, setMinutes] = useState(initialMinutes ?? '');
  const [decisions, setDecisions] = useState(initialDecisions ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, decisions, status: 'completed' }),
      });
      if (!res.ok) throw new Error();
      toast({ title: 'Minutes saved', description: 'Meeting minutes and decisions recorded.' });
      onSaved();
    } catch {
      toast({ title: 'Error', description: 'Failed to save minutes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4 bg-amber-50">
      <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
        <FileText className="h-4 w-4" /> Record Meeting Minutes
      </p>
      <div className="space-y-2">
        <Label className="text-xs">Minutes / Notes</Label>
        <Textarea
          placeholder="Summarise what was discussed..."
          rows={4}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="bg-white text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Key Decisions</Label>
        <Textarea
          placeholder="List the decisions made..."
          rows={3}
          value={decisions}
          onChange={(e) => setDecisions(e.target.value)}
          className="bg-white text-sm"
        />
      </div>
      <Button size="sm" onClick={save} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
        Save & Mark Completed
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MeetingDetailSheetProps {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (id: string) => void;
  currentUserId: string;
}

export default function MeetingDetailSheet({
  meeting,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  currentUserId,
}: MeetingDetailSheetProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [showMinutes, setShowMinutes] = useState(false);

  if (!meeting) return null;

  const isOrganizer = meeting.organizerId === currentUserId;
  const isPast = new Date(meeting.endsAt) < new Date();
  const canEdit = isOrganizer;
  const canDelete = isOrganizer;
  const canRecordMinutes = isOrganizer && (isPast || meeting.status === 'completed');

  const acceptedCount = meeting.attendees.filter((a) => a.status === 'accepted' || a.status === 'attended').length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
          <SheetHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <Badge variant="outline" className="text-xs mb-1">{getCategoryLabel(meeting)}</Badge>
                <SheetTitle className="text-base leading-snug">{meeting.subject}</SheetTitle>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(meeting)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowDelete(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-5 mt-2">
            {/* Meta */}
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                <div>
                  <p>{formatDateTime(meeting.scheduledAt)}</p>
                  <p className="text-xs text-slate-400">Duration: {formatDuration(meeting.scheduledAt, meeting.endsAt)}</p>
                </div>
              </div>
              {meeting.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{meeting.location}</span>
                </div>
              )}
              {meeting.meetLink && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-500 shrink-0" />
                  <a
                    href={meeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    Join Google Meet <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{meeting.attendees.length} attendees · {acceptedCount} confirmed</span>
              </div>
              {meeting.department && (
                <p className="text-xs text-slate-400">Department: {meeting.department.name}</p>
              )}
            </div>

            {/* Agenda */}
            {meeting.agenda && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agenda</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 border p-3">{meeting.agenda}</p>
              </div>
            )}

            {/* Minutes (read) */}
            {meeting.minutes && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minutes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 border p-3">{meeting.minutes}</p>
              </div>
            )}
            {meeting.decisions && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key Decisions</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-emerald-50 border border-emerald-200 p-3">{meeting.decisions}</p>
              </div>
            )}

            {/* Record Minutes */}
            {canRecordMinutes && !showMinutes && (
              <Button variant="outline" size="sm" onClick={() => setShowMinutes(true)}
                className="w-full border-dashed text-amber-700 border-amber-300 hover:bg-amber-50">
                <FileText className="h-4 w-4 mr-1.5" />
                {meeting.minutes ? 'Edit Meeting Minutes' : 'Record Meeting Minutes'}
              </Button>
            )}
            {showMinutes && (
              <MinutesEditor
                meetingId={meeting.id}
                initialMinutes={meeting.minutes}
                initialDecisions={meeting.decisions}
                onSaved={() => { setShowMinutes(false); onOpenChange(false); }}
              />
            )}

            {/* Attendees */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Attendees
              </p>
              <div className="space-y-1.5">
                {meeting.attendees.map((a) => {
                  const cfg = ATTENDEE_STATUS[a.status] ?? ATTENDEE_STATUS.invited;
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 bg-white">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{a.user.name}</p>
                        {a.user.position && <p className="text-xs text-slate-400">{a.user.position}</p>}
                      </div>
                      <Badge className={`text-xs flex items-center gap-1 border-0 ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </Badge>
                    </div>
                  );
                })}
                {meeting.attendees.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">No attendees added</p>
                )}
              </div>
            </div>

            {/* Linked Tasks */}
            {meeting.tasks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" /> Tasks for Discussion
                </p>
                <div className="space-y-1.5">
                  {meeting.tasks.map((mt) => (
                    <div key={mt.id} className="flex items-start justify-between rounded-lg border px-3 py-2 bg-white gap-2">
                      <p className="text-sm text-slate-700 flex-1">{mt.task.title}</p>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge className={`text-xs border-0 ${TASK_PRIORITY_COLOR[mt.task.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                          {mt.task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{mt.task.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &ldquo;{meeting.subject}&rdquo; and notify attendees. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Meeting</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => { setShowDelete(false); onDelete(meeting.id); }}
            >
              Cancel Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
