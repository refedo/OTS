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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MEETING_CATEGORIES } from '@/lib/services/meeting.service';
import { Loader2, X, Search, Video } from 'lucide-react';

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

// ─── Multi-select with search ──────────────────────────────────────────────────

function MultiSearchSelect<T extends { id: string; name: string; sub?: string }>({
  label,
  items,
  selected,
  onToggle,
  placeholder,
}: {
  label: string;
  items: T[];
  selected: string[];
  onToggle: (id: string) => void;
  placeholder: string;
}) {
  const [q, setQ] = useState('');
  const filtered = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  const selectedItems = items.filter((i) => selected.includes(i.id));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((i) => (
            <Badge key={i.id} variant="secondary" className="flex items-center gap-1 text-xs">
              {i.name}
              <button type="button" onClick={() => onToggle(i.id)}>
                <X className="h-3 w-3 hover:text-red-500" />
              </button>
            </Badge>
          ))}
        </div>
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
      <div className="max-h-40 overflow-y-auto rounded-md border divide-y text-sm">
        {filtered.length === 0 && <p className="p-2 text-slate-400 text-xs text-center">No results</p>}
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${selected.includes(item.id) ? 'bg-indigo-50' : ''}`}
          >
            <span className="font-medium text-slate-700">{item.name}</span>
            <div className="flex items-center gap-2">
              {item.sub && <span className="text-slate-400 text-xs">{item.sub}</span>}
              {selected.includes(item.id) && <span className="text-indigo-600 text-xs">✓</span>}
            </div>
          </button>
        ))}
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

  // Populate form on edit
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

  // Load reference data
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
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader className="pb-4">
          <SheetTitle>{isEdit ? 'Edit Meeting' : 'Schedule Meeting'}</SheetTitle>
          <SheetDescription>Fill in the details below to {isEdit ? 'update the' : 'schedule a new'} meeting.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Meeting Type <span className="text-red-500">*</span></Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select meeting type..." />
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

          {/* Custom category label */}
          {category === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="categoryCustom">Custom Category Name</Label>
              <Input id="categoryCustom" placeholder="e.g. Board Advisory Session" {...register('categoryCustom')} />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Meeting Subject <span className="text-red-500">*</span></Label>
            <Input id="subject" placeholder="e.g. Q2 Sales Review — Central Region" {...register('subject')} />
            {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
          </div>

          {/* Date/time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Start Date & Time <span className="text-red-500">*</span></Label>
              <Input id="scheduledAt" type="datetime-local" {...register('scheduledAt')} />
              {errors.scheduledAt && <p className="text-xs text-red-500">{errors.scheduledAt.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End Date & Time <span className="text-red-500">*</span></Label>
              <Input id="endsAt" type="datetime-local" {...register('endsAt')} />
              {errors.endsAt && <p className="text-xs text-red-500">{errors.endsAt.message}</p>}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input id="location" placeholder="e.g. Conference Room A, or leave blank for online-only" {...register('location')} />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label>Department <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department..." />
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

          {/* Attendees */}
          <MultiSearchSelect
            label="Attendees"
            items={userItems}
            selected={attendeeIds}
            onToggle={toggleAttendee}
            placeholder="Search employees..."
          />

          {/* Linked Tasks */}
          <MultiSearchSelect
            label="OTS Tasks for Discussion"
            items={taskItems}
            selected={taskIds}
            onToggle={toggleTask}
            placeholder="Search tasks..."
          />

          {/* Agenda */}
          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Textarea id="agenda" placeholder="List agenda items..." rows={4} {...register('agenda')} />
          </div>

          {/* Toggles */}
          <div className="space-y-3 rounded-lg border p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Private Meeting</p>
                <p className="text-xs text-slate-500">Only visible to organiser and attendees</p>
              </div>
              <Controller
                name="isPrivate"
                control={control}
                render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
            {!isEdit && (
              <div className="flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Generate Google Meet Link</p>
                    <p className="text-xs text-slate-500">Auto-creates a Meet link via Google Calendar</p>
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

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {isEdit ? 'Save Changes' : 'Schedule Meeting'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
