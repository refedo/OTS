'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MEETING_CATEGORIES } from '@/lib/services/meeting.constants';
import {
  Loader2,
  X,
  Search,
  Video,
  Calendar,
  MapPin,
  Building2,
  Users,
  ClipboardList,
  Lock,
  AlignLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  position: string | null;
  department?: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignedTo?: { name: string } | null;
}

interface MeetingFormData {
  category: string;
  categoryCustom: string;
  subject: string;
  scheduledAt: string;
  endsAt: string;
  location: string;
  agenda: string;
  departmentId: string;
  isPrivate: boolean;
  generateMeetLink: boolean;
  attendeeIds: string[];
  taskIds: string[];
}

const schema = z.object({
  category: z.string().min(1, 'Category is required'),
  categoryCustom: z.string().max(150).optional(),
  subject: z.string().min(2, 'Subject is required').max(255),
  scheduledAt: z.string().min(1, 'Start date/time is required'),
  endsAt: z.string().min(1, 'End date/time is required'),
  location: z.string().max(255).optional(),
  agenda: z.string().optional(),
  departmentId: z.string().optional(),
  isPrivate: z.boolean(),
  generateMeetLink: z.boolean(),
  attendeeIds: z.array(z.string()),
  taskIds: z.array(z.string()),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDatetimeInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeInput(local: string): string {
  return new Date(local).toISOString();
}

function nameToColor(name: string): string {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-orange-500',
    'bg-pink-500', 'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Icon className="h-4 w-4 text-indigo-500 shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

// ─── Multi-select with search ──────────────────────────────────────────────────

function MultiSearchSelect<T extends { id: string; name: string; sub?: string }>({
  label,
  items,
  selected,
  onToggle,
  placeholder,
  showAvatars = false,
}: {
  label: string;
  items: T[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder: string;
  showAvatars?: boolean;
}) {
  const [q, setQ] = useState('');
  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const selectedItems = items.filter((i) => selected.includes(i.id));

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((i) => (
            <span
              key={i.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 pl-1 pr-2 py-0.5 text-xs font-medium text-indigo-800"
            >
              {showAvatars ? (
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-white text-[9px] font-bold shrink-0 ${nameToColor(i.name)}`}>
                  {initials(i.name)}
                </span>
              ) : null}
              {i.name}
              <button type="button" onClick={() => onToggle(i.id)} className="text-indigo-400 hover:text-red-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">{showAvatars ? 'No attendees added yet' : 'No tasks linked yet'}</p>
      )}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          className="pl-8 h-8 text-sm"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="max-h-36 overflow-y-auto rounded-md border divide-y text-sm bg-white">
        {filtered.length === 0 && (
          <p className="p-3 text-slate-400 text-xs text-center">
            {q ? `No results for "${q}"` : 'Nothing available'}
          </p>
        )}
        {filtered.map((item) => {
          const isSelected = selected.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
            >
              {showAvatars && (
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-[10px] font-bold shrink-0 ${nameToColor(item.name)}`}>
                  {initials(item.name)}
                </span>
              )}
              <span className="flex-1 font-medium text-slate-700 truncate">{item.name}</span>
              {item.sub && <span className="text-slate-400 text-xs shrink-0">{item.sub}</span>}
              {isSelected && <span className="text-indigo-600 text-xs font-semibold shrink-0">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sheet Component ───────────────────────────────────────────────────────────

interface MeetingFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: {
    id: string;
    category: string;
    categoryCustom: string | null;
    subject: string;
    scheduledAt: string;
    endsAt: string;
    location: string | null;
    agenda: string | null;
    isPrivate: boolean;
    departmentId: string | null;
    meetLink: string | null;
    attendees: { userId: string }[];
    tasks: { taskId: string }[];
  } | null;
  onSuccess: () => void;
}

export default function MeetingFormSheet({ open, onOpenChange, meeting, onSuccess }: MeetingFormSheetProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [saving, setSaving] = useState(false);

  const isEdit = !!meeting;

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<MeetingFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: '',
      categoryCustom: '',
      subject: '',
      scheduledAt: '',
      endsAt: '',
      location: '',
      agenda: '',
      departmentId: '',
      isPrivate: false,
      generateMeetLink: false,
      attendeeIds: [],
      taskIds: [],
    },
  });

  const category = watch('category');
  const attendeeIds = watch('attendeeIds');
  const taskIds = watch('taskIds');

  useEffect(() => {
    if (meeting) {
      reset({
        category: meeting.category,
        categoryCustom: meeting.categoryCustom ?? '',
        subject: meeting.subject,
        scheduledAt: toLocalDatetimeInput(meeting.scheduledAt),
        endsAt: toLocalDatetimeInput(meeting.endsAt),
        location: meeting.location ?? '',
        agenda: meeting.agenda ?? '',
        departmentId: meeting.departmentId ?? '',
        isPrivate: meeting.isPrivate,
        generateMeetLink: false,
        attendeeIds: meeting.attendees.map((a) => a.userId),
        taskIds: meeting.tasks.map((t) => t.taskId),
      });
    } else {
      reset({
        category: '',
        categoryCustom: '',
        subject: '',
        scheduledAt: '',
        endsAt: '',
        location: '',
        agenda: '',
        departmentId: '',
        isPrivate: false,
        generateMeetLink: false,
        attendeeIds: [],
        taskIds: [],
      });
    }
  }, [meeting, reset, open]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/users?status=active&pageSize=200').then((r) => r.json()),
      fetch('/api/departments').then((r) => r.json()),
      fetch('/api/tasks?pageSize=200&status=Pending').then((r) => r.json()),
    ]).then(([u, d, t]) => {
      setUsers(Array.isArray(u) ? u : []);
      setDepartments(Array.isArray(d) ? d : []);
      setTasks(Array.isArray(t) ? t : []);
    }).catch(() => {});
  }, [open]);

  const toggleAttendee = (id: string) => {
    setValue('attendeeIds', attendeeIds.includes(id) ? attendeeIds.filter((x) => x !== id) : [...attendeeIds, id]);
  };

  const toggleTask = (id: string) => {
    setValue('taskIds', taskIds.includes(id) ? taskIds.filter((x) => x !== id) : [...taskIds, id]);
  };

  const onSubmit = async (data: MeetingFormData) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        scheduledAt: fromLocalDatetimeInput(data.scheduledAt),
        endsAt: fromLocalDatetimeInput(data.endsAt),
        categoryCustom: data.categoryCustom || null,
        location: data.location || null,
        agenda: data.agenda || null,
        departmentId: data.departmentId || null,
      };

      const url = isEdit ? `/api/meetings/${meeting!.id}` : '/api/meetings';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to save meeting');
      }

      toast({ title: isEdit ? 'Meeting updated' : 'Meeting scheduled', description: 'Changes saved successfully.' });
      onSuccess();
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const userItems = users.map((u) => ({ id: u.id, name: u.name, sub: u.position ?? undefined }));
  const taskItems = tasks.map((t) => ({ id: t.id, name: t.title, sub: t.status }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="right">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-lg">{isEdit ? 'Edit Meeting' : 'Schedule a Meeting'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Update the meeting details below.' : 'Fill in the details to schedule a new meeting.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-5 pb-8">

          {/* ── Meeting Details ── */}
          <SectionHeader icon={Calendar} title="Meeting Details" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="category">Meeting Type <span className="text-red-500">*</span></Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select meeting type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>

            {category === 'other' && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="categoryCustom">Custom Category Name</Label>
                <Input id="categoryCustom" placeholder="e.g. Board Advisory Session" {...register('categoryCustom')} />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="subject">Meeting Subject <span className="text-red-500">*</span></Label>
              <Input id="subject" placeholder="e.g. Q2 Sales Review — Central Region" {...register('subject')} />
              {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
            </div>
          </div>

          {/* ── Schedule ── */}
          <SectionHeader icon={Calendar} title="Schedule" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Start <span className="text-red-500">*</span></Label>
              <Input id="scheduledAt" type="datetime-local" {...register('scheduledAt')} />
              {errors.scheduledAt && <p className="text-xs text-red-500">{errors.scheduledAt.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End <span className="text-red-500">*</span></Label>
              <Input id="endsAt" type="datetime-local" {...register('endsAt')} />
              {errors.endsAt && <p className="text-xs text-red-500">{errors.endsAt.message}</p>}
            </div>
          </div>

          {/* ── Location & Department ── */}
          <SectionHeader icon={MapPin} title="Location & Department" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
              <Input id="location" placeholder="Conference Room A, or blank for online" {...register('location')} />
            </div>
            <div className="space-y-2">
              <Label>Department <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific department</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* ── People ── */}
          <SectionHeader icon={Users} title="People" />

          <MultiSearchSelect
            label="Attendees"
            items={userItems}
            selected={attendeeIds}
            onToggle={toggleAttendee}
            placeholder="Search employees…"
            showAvatars
          />

          {/* ── Discussion ── */}
          <SectionHeader icon={ClipboardList} title="Discussion" />

          <MultiSearchSelect
            label="OTS Tasks for Discussion"
            items={taskItems}
            selected={taskIds}
            onToggle={toggleTask}
            placeholder="Search tasks…"
          />

          <div className="space-y-2">
            <Label htmlFor="agenda">
              <span className="flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5 text-slate-400" />
                Agenda <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </span>
            </Label>
            <Textarea id="agenda" placeholder="List the agenda items for this meeting…" rows={4} {...register('agenda')} />
          </div>

          {/* ── Options ── */}
          <SectionHeader icon={Lock} title="Options" />

          <div className="rounded-xl border bg-slate-50/80 divide-y overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Private Meeting</p>
                <p className="text-xs text-slate-500 mt-0.5">Only visible to organiser and attendees</p>
              </div>
              <Controller
                name="isPrivate"
                control={control}
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
            {!isEdit && (
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-md bg-blue-50 p-1.5">
                    <Video className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Generate Google Meet Link</p>
                    <p className="text-xs text-slate-500 mt-0.5">Auto-creates a Meet link via Google Calendar</p>
                  </div>
                </div>
                <Controller
                  name="generateMeetLink"
                  control={control}
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {isEdit ? 'Save Changes' : 'Schedule Meeting'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
