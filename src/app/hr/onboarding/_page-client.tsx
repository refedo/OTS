'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  UserPlus, Search, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Calendar, User, Settings, Plus, Pencil, Trash2, GripVertical,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Employee = {
  id: string;
  employmentId: string;
  fullNameEn: string;
  fullNameAr: string | null;
  occupation: string | null;
  department: string | null;
  section: string | null;
  dateOfJoining: string;
  nationalId: string | null;
};

type OnboardingTask = {
  id: string;
  labelEn: string;
  labelAr: string | null;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
};

const BLANK_TASK = { labelEn: '', labelAr: '', description: '', sortOrder: 0, isRequired: true };

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function OnboardingClient({ employees }: { employees: Employee[] }) {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, Set<string>>>({} as Record<string, Set<string>>);

  // Manage tasks dialog
  const [manageOpen, setManageOpen] = useState(false);
  const [taskDialog, setTaskDialog] = useState<'create' | 'edit' | null>(null);
  const [editTask, setEditTask] = useState<OnboardingTask | null>(null);
  const [taskForm, setTaskForm] = useState({ ...BLANK_TASK });
  const [savingTask, setSavingTask] = useState(false);
  const [deleteTask, setDeleteTask] = useState<OnboardingTask | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api/hr/onboarding-tasks');
      if (res.ok) setTasks(await res.json());
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const toggle = (empId: string, taskId: string) => {
    setChecked((prev: Record<string, Set<string>>) => {
      const set = new Set(prev[empId] ?? []);
      if (set.has(taskId)) set.delete(taskId); else set.add(taskId);
      return { ...prev, [empId]: set };
    });
  };

  const filtered = employees.filter(e =>
    !search.trim() ||
    e.fullNameEn.toLowerCase().includes(search.toLowerCase()) ||
    e.employmentId.toLowerCase().includes(search.toLowerCase()) ||
    (e.occupation ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const completedToday = employees.filter(e => daysSince(e.dateOfJoining) <= 7).length;
  const activeTasks = tasks.filter((t: OnboardingTask) => t.isActive);

  function openCreateTask() {
    setTaskForm({ ...BLANK_TASK, sortOrder: tasks.length + 1 });
    setEditTask(null);
    setTaskDialog('create');
  }

  function openEditTask(t: OnboardingTask) {
    setTaskForm({ labelEn: t.labelEn, labelAr: t.labelAr ?? '', description: t.description ?? '', sortOrder: t.sortOrder, isRequired: t.isRequired });
    setEditTask(t);
    setTaskDialog('edit');
  }

  async function saveTask() {
    if (!taskForm.labelEn.trim()) return;
    setSavingTask(true);
    try {
      const isEdit = taskDialog === 'edit' && editTask;
      const url = isEdit ? `/api/hr/onboarding-tasks/${editTask.id}` : '/api/hr/onboarding-tasks';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labelEn: taskForm.labelEn,
          labelAr: taskForm.labelAr || undefined,
          description: taskForm.description || undefined,
          sortOrder: taskForm.sortOrder,
          isRequired: taskForm.isRequired,
          isActive: true,
        }),
      });
      if (res.ok) { setTaskDialog(null); loadTasks(); }
    } finally {
      setSavingTask(false);
    }
  }

  async function confirmDeleteTask() {
    if (!deleteTask) return;
    setDeletingTask(true);
    try {
      const res = await fetch(`/api/hr/onboarding-tasks/${deleteTask.id}`, { method: 'DELETE' });
      if (res.ok) { setDeleteTask(null); loadTasks(); }
    } finally {
      setDeletingTask(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold">Employee Onboarding</h1>
              </div>
              <p className="text-violet-100 text-sm">Track onboarding progress for employees who joined in the last 3 months</p>
            </div>
            <Button size="sm" onClick={() => setManageOpen(true)} className="bg-white text-violet-700 hover:bg-violet-50 border-0 shadow-sm">
              <Settings className="mr-2 h-4 w-4" />
              Manage Checklist
            </Button>
          </div>
        </div>

        {/* KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white border-violet-200 p-4 shadow-sm">
            <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Active Onboardings</p>
            <p className="text-2xl font-bold text-violet-700 mt-1">{employees.length}</p>
            <p className="text-xs text-violet-500 mt-0.5">last 3 months</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white border-emerald-200 p-4 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Joined This Week</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{completedToday}</p>
            <p className="text-xs text-emerald-500 mt-0.5">new in last 7 days</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-sky-50 to-white border-sky-200 p-4 shadow-sm">
            <p className="text-xs text-sky-600 font-medium uppercase tracking-wide">Checklist Items</p>
            <p className="text-2xl font-bold text-sky-700 mt-1">{loadingTasks ? '…' : activeTasks.length}</p>
            <p className="text-xs text-sky-500 mt-0.5">per employee</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-b from-amber-50 to-white border-amber-200 p-4 shadow-sm">
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Avg Days Since Joined</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {employees.length > 0
                ? Math.round(employees.reduce((s, e) => s + daysSince(e.dateOfJoining), 0) / employees.length)
                : 0}
            </p>
            <p className="text-xs text-amber-500 mt-0.5">days since joining</p>
          </div>
        </div>

        {/* Employee list */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50/50 flex gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search employees…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            <p className="text-xs text-slate-400 shrink-0">{filtered.length} employees</p>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <UserPlus className="h-10 w-10 mx-auto mb-2 text-slate-200" />
              <p className="font-medium">No new employees in the last 3 months</p>
              <p className="text-xs mt-1">New hires will appear here automatically</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(e => {
                const completedSet = checked[e.id] ?? new Set<string>();
                const completedCount = completedSet.size;
                const totalTasks = activeTasks.length;
                const pct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
                const isExpanded = expanded === e.id;
                const days = daysSince(e.dateOfJoining);

                return (
                  <div key={e.id}>
                    <button
                      className="w-full px-6 py-4 flex items-center gap-4 hover:bg-violet-50/30 transition-colors text-left"
                      onClick={() => setExpanded(isExpanded ? null : e.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                        {e.fullNameEn.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{e.fullNameEn}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {e.employmentId} · {e.occupation ?? 'No position'} · {e.department ?? 'No dept'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-500' : 'bg-violet-400')}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 tabular-nums w-8">{pct}%</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center justify-end gap-1">
                          <Calendar className="h-3 w-3" />
                          {days === 0 ? 'Today' : `${days}d ago`}
                        </p>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-4 border-t border-violet-100 bg-violet-50/20">
                        <div className="flex items-center justify-between py-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Onboarding Checklist
                            <span className="ml-2 font-normal text-slate-400">({completedCount}/{totalTasks})</span>
                          </p>
                          <Link href={`/hr/employees/${e.id}`} className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                            <User className="h-3 w-3" />
                            View profile
                          </Link>
                        </div>
                        {loadingTasks ? (
                          <p className="text-xs text-slate-400 py-2">Loading checklist…</p>
                        ) : activeTasks.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">No checklist items. Click <strong>Manage Checklist</strong> to add items.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeTasks.map(task => {
                              const done = completedSet.has(task.id);
                              return (
                                <button
                                  key={task.id}
                                  onClick={() => toggle(e.id, task.id)}
                                  className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-xs transition-all',
                                    done
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-violet-200'
                                  )}
                                >
                                  {done
                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                    : <Circle className="h-4 w-4 text-slate-300 shrink-0" />}
                                  <span className={cn(done && 'line-through opacity-70')}>{task.labelEn}</span>
                                  {task.isRequired && <span className="ml-auto text-rose-400 text-[10px] font-medium shrink-0">Required</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manage Checklist Dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-violet-600" />
              Manage Onboarding Checklist
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-end">
              <Button size="sm" onClick={openCreateTask} className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
            {loadingTasks ? (
              <p className="text-sm text-slate-400 text-center py-4">Loading…</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No tasks yet. Add your first checklist item.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg border bg-white',
                    !task.isActive && 'opacity-50'
                  )}>
                    <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{task.labelEn}</p>
                      {task.labelAr && <p className="text-xs text-slate-500 mt-0.5" dir="rtl">{task.labelAr}</p>}
                      {task.description && <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.isRequired && <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-1.5 py-0.5 rounded">Required</span>}
                      {!task.isActive && <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">Inactive</span>}
                      <button onClick={() => openEditTask(task)} className="p-1.5 rounded hover:bg-violet-100 text-slate-400 hover:text-violet-600 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTask(task)} className="p-1.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Task Dialog */}
      <Dialog open={taskDialog !== null} onOpenChange={open => !open && setTaskDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{taskDialog === 'edit' ? 'Edit Checklist Item' : 'Add Checklist Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Label (English) <span className="text-rose-500">*</span></Label>
              <Input value={taskForm.labelEn} onChange={e => setTaskForm(f => ({ ...f, labelEn: e.target.value }))} placeholder="e.g. Employment contract signed" />
            </div>
            <div className="space-y-1.5">
              <Label>التسمية (عربي)</Label>
              <Input value={taskForm.labelAr} onChange={e => setTaskForm(f => ({ ...f, labelAr: e.target.value }))} placeholder="مثال: توقيع عقد العمل" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional additional details" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={taskForm.sortOrder} onChange={e => setTaskForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={taskForm.isRequired}
                  onChange={e => setTaskForm(f => ({ ...f, isRequired: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isRequired" className="text-sm text-slate-600">Required task</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialog(null)}>Cancel</Button>
            <Button onClick={saveTask} disabled={savingTask || !taskForm.labelEn.trim()} className="bg-violet-600 hover:bg-violet-700 text-white">
              {savingTask ? 'Saving…' : taskDialog === 'edit' ? 'Save Changes' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation */}
      <Dialog open={!!deleteTask} onOpenChange={open => !open && setDeleteTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Checklist Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{deleteTask?.labelEn}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTask(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteTask} disabled={deletingTask}>
              {deletingTask ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
