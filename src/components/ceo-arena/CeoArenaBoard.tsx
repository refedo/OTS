'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, CheckCircle2, Circle, Clock, Flame,
  Lightbulb, HeartCrack, RefreshCw, X, ChevronDown,
  Tag, Sparkles, Brain, AlertCircle, Loader2, MoreVertical,
  ArrowUpCircle, MinusCircle, ArrowDownCircle, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type NoteType = 'brainstorm' | 'headache' | 'zeigarnik';
type Priority = 'low' | 'medium' | 'high' | 'critical';
type NoteStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

interface CeoNote {
  id: string;
  type: NoteType;
  title: string;
  content: string;
  color: string;
  priority: Priority;
  status: NoteStatus;
  tags: string | null;
  position: number;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STICKY_COLORS = [
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#fde68a', // amber
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
  '#f5d0fe', // pink
  '#cffafe', // cyan
  '#d1fae5', // emerald
];

const PRIORITY_CONFIG: Record<Priority, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  low:      { label: 'Low',      icon: ArrowDownCircle, color: 'text-slate-500',  bg: 'bg-slate-100'  },
  medium:   { label: 'Medium',   icon: MinusCircle,     color: 'text-blue-500',   bg: 'bg-blue-50'    },
  high:     { label: 'High',     icon: ArrowUpCircle,   color: 'text-orange-500', bg: 'bg-orange-50'  },
  critical: { label: 'Critical', icon: Flame,           color: 'text-red-500',    bg: 'bg-red-50'     },
};

const STATUS_CONFIG: Record<NoteStatus, { label: string; icon: React.ElementType; color: string }> = {
  open:        { label: 'Open',        icon: Circle,        color: 'text-slate-400'  },
  in_progress: { label: 'In Progress', icon: Clock,         color: 'text-blue-500'   },
  resolved:    { label: 'Resolved',    icon: CheckCircle2,  color: 'text-green-500'  },
  dismissed:   { label: 'Dismissed',   icon: X,             color: 'text-slate-400'  },
};

const SECTION_META: Record<NoteType, {
  label: string; emoji: string; description: string;
  icon: React.ElementType; gradient: string; accent: string; defaultColor: string;
}> = {
  brainstorm: {
    label: 'Brainstorm Board', emoji: '💡',
    description: 'Capture ideas, insights, and creative sparks',
    icon: Lightbulb,
    gradient: 'from-amber-50 via-yellow-50 to-orange-50',
    accent: 'border-amber-200 bg-amber-50',
    defaultColor: '#fef08a',
  },
  headache: {
    label: 'Headaches', emoji: '🤯',
    description: 'Problems, blockers, and pain points that need solving',
    icon: HeartCrack,
    gradient: 'from-red-50 via-rose-50 to-pink-50',
    accent: 'border-red-200 bg-red-50',
    defaultColor: '#fecaca',
  },
  zeigarnik: {
    label: 'Open Loops', emoji: '🔄',
    description: 'Unfinished thoughts and tasks that occupy mental bandwidth',
    icon: Brain,
    gradient: 'from-violet-50 via-purple-50 to-indigo-50',
    accent: 'border-violet-200 bg-violet-50',
    defaultColor: '#e9d5ff',
  },
};

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function NoteCard({
  note,
  onUpdate,
  onDelete,
}: {
  note: CeoNote;
  onUpdate: (id: string, data: Partial<CeoNote>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const tags = parseTags(note.tags);
  const PriorityIcon = PRIORITY_CONFIG[note.priority].icon;
  const StatusIcon = STATUS_CONFIG[note.status].icon;
  const isDone = note.status === 'resolved' || note.status === 'dismissed';

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    await onUpdate(note.id, { title: editTitle.trim(), content: editContent.trim() });
    setSaving(false);
    setEditing(false);
  };

  const cycleStatus = async () => {
    const cycle: NoteStatus[] = ['open', 'in_progress', 'resolved'];
    const idx = cycle.indexOf(note.status as NoteStatus);
    const next = cycle[(idx + 1) % cycle.length];
    await onUpdate(note.id, { status: next });
  };

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-all duration-200',
        'flex flex-col gap-2 p-4 text-sm',
        isDone && 'opacity-60',
      )}
      style={{ backgroundColor: note.color }}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <button
          onClick={cycleStatus}
          className="mt-0.5 shrink-0 hover:scale-110 transition-transform"
          title={`Status: ${STATUS_CONFIG[note.status].label}`}
        >
          <StatusIcon className={cn('size-4', STATUS_CONFIG[note.status].color)} />
        </button>

        {editing ? (
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="h-6 py-0 text-sm font-semibold bg-white/70 border-black/10 flex-1"
            autoFocus
          />
        ) : (
          <p className={cn('font-semibold text-gray-800 flex-1 leading-snug cursor-pointer', isDone && 'line-through')}
            onClick={() => setEditing(true)}>
            {note.title}
          </p>
        )}

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 shrink-0 -mr-1 -mt-1">
              <MoreVertical className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel edit' : 'Edit note'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(['open', 'in_progress', 'resolved', 'dismissed'] as NoteStatus[]).map(s => (
              <DropdownMenuItem key={s} onClick={() => onUpdate(note.id, { status: s })}
                className={note.status === s ? 'font-semibold' : ''}>
                <StatusIcon className={cn('size-4 mr-2', STATUS_CONFIG[s].color)} />
                {STATUS_CONFIG[s].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
              <DropdownMenuItem key={p} onClick={() => onUpdate(note.id, { priority: p })}
                className={note.priority === p ? 'font-semibold' : ''}>
                {PRIORITY_CONFIG[p].label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <p className="text-xs text-muted-foreground mb-1.5">Color</p>
              <div className="flex flex-wrap gap-1">
                {STICKY_COLORS.map(c => (
                  <button key={c} onClick={() => onUpdate(note.id, { color: c })}
                    className={cn('size-5 rounded-full border border-black/10 hover:scale-110 transition-transform',
                      note.color === c && 'ring-2 ring-offset-1 ring-gray-400')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(note.id)} className="text-red-600">
              <Trash2 className="size-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {editing ? (
        <Textarea
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          className="text-sm bg-white/70 border-black/10 resize-none min-h-[60px]"
          rows={3}
        />
      ) : (
        note.content && (
          <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap cursor-pointer"
            onClick={() => setEditing(true)}>
            {note.content}
          </p>
        )
      )}

      {/* Edit actions */}
      {editing && (
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-7 text-xs" onClick={saveEdit} disabled={saving}>
            {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
            Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
            setEditing(false);
            setEditTitle(note.title);
            setEditContent(note.content);
          }}>Cancel</Button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <span className={cn('inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5',
          PRIORITY_CONFIG[note.priority].bg, PRIORITY_CONFIG[note.priority].color)}>
          <PriorityIcon className="size-3" />
          {PRIORITY_CONFIG[note.priority].label}
        </span>
        {tags.map(t => (
          <Badge key={t} variant="secondary" className="text-xs h-5 px-1.5 bg-black/5">
            {t}
          </Badge>
        ))}
        <span className="ml-auto text-xs text-gray-400">
          {format(new Date(note.createdAt), 'MMM d')}
        </span>
      </div>
    </div>
  );
}

function AddNoteForm({
  type,
  defaultColor,
  onAdd,
  onCancel,
}: {
  type: NoteType;
  defaultColor: string;
  onAdd: (data: { title: string; content: string; priority: Priority; color: string; tags: string[] }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [color, setColor] = useState(defaultColor);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onAdd({ title: title.trim(), content: content.trim(), priority, color, tags });
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-black/10 shadow-md p-4 flex flex-col gap-3 mt-2"
      style={{ backgroundColor: color }}>
      <Input
        placeholder="Note title…"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="bg-white/70 border-black/10 font-semibold text-sm"
        autoFocus
      />
      <Textarea
        placeholder="Details, context, or anything on your mind…"
        value={content}
        onChange={e => setContent(e.target.value)}
        className="bg-white/70 border-black/10 text-sm resize-none min-h-[70px]"
        rows={3}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs bg-white/70 border-black/10 gap-1">
              {PRIORITY_CONFIG[priority].label} <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(['low', 'medium', 'high', 'critical'] as Priority[]).map(p => (
              <DropdownMenuItem key={p} onClick={() => setPriority(p)}>
                {PRIORITY_CONFIG[p].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Color picker */}
        <div className="flex items-center gap-1">
          {STICKY_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={cn('size-5 rounded-full border border-black/10 hover:scale-110 transition-transform',
                color === c && 'ring-2 ring-offset-1 ring-gray-400')}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        {tags.map(t => (
          <Badge key={t} variant="secondary" className="text-xs gap-1 bg-black/10">
            {t}
            <button onClick={() => setTags(tags.filter(x => x !== t))}><X className="size-2.5" /></button>
          </Badge>
        ))}
        <div className="flex items-center gap-1">
          <Input
            placeholder="Add tag…"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            className="h-6 text-xs w-28 bg-white/70 border-black/10"
          />
          <Button variant="ghost" size="icon" className="size-6" onClick={addTag}>
            <Tag className="size-3" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="h-8" onClick={submit} disabled={saving || !title.trim()}>
          {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : <Plus className="size-3 mr-1" />}
          Add Note
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function SectionColumn({
  type,
  notes,
  onAdd,
  onUpdate,
  onDelete,
}: {
  type: NoteType;
  notes: CeoNote[];
  onAdd: (type: NoteType, data: Parameters<AddNoteForm['onAdd']>[0]) => Promise<void>;
  onUpdate: (id: string, data: Partial<CeoNote>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const meta = SECTION_META[type];
  const SectionIcon = meta.icon;
  const [adding, setAdding] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const active = notes.filter(n => n.status !== 'resolved' && n.status !== 'dismissed');
  const resolved = notes.filter(n => n.status === 'resolved' || n.status === 'dismissed');

  return (
    <div className={cn('flex flex-col rounded-2xl p-5 min-h-[500px] bg-gradient-to-b', meta.gradient,
      'border border-black/5 shadow-sm')}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn('p-2 rounded-xl', meta.accent)}>
            <SectionIcon className="size-4 text-gray-700" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 text-base leading-tight">
              {meta.emoji} {meta.label}
            </h2>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">{meta.description}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs font-semibold">
          {active.length}
        </Badge>
      </div>

      {/* Add button */}
      {!adding ? (
        <Button
          variant="outline"
          className="w-full border-dashed border-black/20 bg-white/50 hover:bg-white/80 text-gray-600 text-sm mb-4 gap-2"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" /> Add {type === 'brainstorm' ? 'Idea' : type === 'headache' ? 'Headache' : 'Open Loop'}
        </Button>
      ) : (
        <AddNoteForm
          type={type}
          defaultColor={meta.defaultColor}
          onAdd={async (data) => { await onAdd(type, data); setAdding(false); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Active notes */}
      <div className="flex flex-col gap-3 flex-1">
        {active.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
            <SectionIcon className="size-10 mb-3" />
            <p className="text-sm font-medium">Nothing here yet</p>
            <p className="text-xs mt-1">Click &ldquo;Add&rdquo; to capture your first entry</p>
          </div>
        )}
        {active.map(note => (
          <NoteCard key={note.id} note={note} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>

      {/* Resolved / dismissed */}
      {resolved.length > 0 && (
        <div className="mt-4 border-t border-black/10 pt-3">
          <button
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-2"
            onClick={() => setShowResolved(!showResolved)}
          >
            <ChevronDown className={cn('size-3 transition-transform', showResolved && 'rotate-180')} />
            {resolved.length} resolved / dismissed
          </button>
          {showResolved && (
            <div className="flex flex-col gap-2">
              {resolved.map(note => (
                <NoteCard key={note.id} note={note} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CeoArenaBoard() {
  const [notes, setNotes] = useState<CeoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch('/api/ceo-arena/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleAdd = async (
    type: NoteType,
    data: { title: string; content: string; priority: Priority; color: string; tags: string[] }
  ) => {
    const res = await fetch('/api/ceo-arena/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, type }),
    });
    if (res.ok) {
      const { note } = await res.json();
      setNotes(prev => [note, ...prev]);
    }
  };

  const handleUpdate = async (id: string, data: Partial<CeoNote>) => {
    const res = await fetch(`/api/ceo-arena/notes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { note } = await res.json();
      setNotes(prev => prev.map(n => n.id === id ? note : n));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/ceo-arena/notes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  const totalOpen = notes.filter(n => n.status === 'open' || n.status === 'in_progress').length;
  const totalResolved = notes.filter(n => n.status === 'resolved').length;
  const criticalCount = notes.filter(n => n.priority === 'critical' && n.status !== 'resolved' && n.status !== 'dismissed').length;

  const notesFor = (type: NoteType) => notes.filter(n => n.type === type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-screen-2xl mx-auto px-6 py-8">

        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-200">
                  <Brain className="size-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">CEO Arena</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Your private command room for thought leadership</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-gray-600"
              onClick={() => fetchNotes(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              { label: 'Open Items', value: totalOpen, icon: Circle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Critical', value: criticalCount, icon: Flame, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
              { label: 'Resolved', value: totalResolved, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
              { label: 'Total Notes', value: notes.length, icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
            ].map(kpi => {
              const KpiIcon = kpi.icon;
              return (
                <div key={kpi.label} className={cn('rounded-xl border p-4 flex items-center gap-3', kpi.bg, kpi.border)}>
                  <div className={cn('p-2 rounded-lg bg-white/80 shadow-sm')}>
                    <KpiIcon className={cn('size-4', kpi.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
                    <p className="text-xs text-gray-500">{kpi.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zeigarnik effect callout */}
          {notes.filter(n => n.type === 'zeigarnik' && n.status === 'open').length > 0 && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 flex items-start gap-3">
              <Zap className="size-4 text-violet-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-violet-800">
                  {notes.filter(n => n.type === 'zeigarnik' && n.status === 'open').length} open loop
                  {notes.filter(n => n.type === 'zeigarnik' && n.status === 'open').length > 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-violet-600 mt-0.5">
                  The Zeigarnik effect means unfinished tasks occupy your mind. Close these loops to free cognitive bandwidth.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Three-column board */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="size-8 animate-spin text-violet-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(['brainstorm', 'headache', 'zeigarnik'] as NoteType[]).map(type => (
              <SectionColumn
                key={type}
                type={type}
                notes={notesFor(type)}
                onAdd={handleAdd}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Footer tip */}
        <div className="mt-8 flex items-center gap-2 text-xs text-gray-400 justify-center">
          <AlertCircle className="size-3.5" />
          <span>Only visible to you — this is your private CEO workspace. Click any note to edit.</span>
        </div>
      </div>
    </div>
  );
}
