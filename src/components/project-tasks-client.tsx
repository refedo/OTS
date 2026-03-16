'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAlert } from '@/hooks/useAlert';

type Task = {
  id: string;
  title: string;
  status: string;
  taskInputDate: string | null;
  dueDate: string | null;
  assignedTo: { id: string; name: string; position: string | null } | null;
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; designation: string; name: string } | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  departmentId: string | null;
};

type Project = {
  id: string;
  projectNumber: string;
  name: string;
};

type Building = {
  id: string;
  designation: string;
  name: string;
  projectId: string;
};

type Props = {
  initialTasks: Task[];
  allUsers: User[];
  allProjects: Project[];
  allBuildings: Building[];
  canCreate: boolean;
};

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  'Waiting for Approval': 'bg-purple-100 text-purple-800 border-purple-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
  Cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function ProjectTasksClient({ initialTasks, allUsers, allProjects, allBuildings, canCreate }: Props) {
  const router = useRouter();
  const { showAlert, AlertDialog } = useAlert();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');

  // Quick add state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [quickAdd, setQuickAdd] = useState({
    title: '',
    assignedToId: '',
    projectId: '',
    buildingId: '',
    status: 'In Progress',
    taskInputDate: new Date().toISOString().split('T')[0],
    dueDate: '',
  });

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    assignedToId: '',
    projectId: '',
    buildingId: '',
    status: 'Pending',
    taskInputDate: '',
    dueDate: '',
  });

  // Sort state
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortIcon = (col: string) => {
    if (sortCol !== col) return <ArrowUpDown className="size-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="size-3 ml-1 text-primary" />
      : <ArrowDown className="size-3 ml-1 text-primary" />;
  };

  const filteredBuildings = useMemo(() =>
    quickAdd.projectId ? allBuildings.filter(b => b.projectId === quickAdd.projectId) : allBuildings,
    [allBuildings, quickAdd.projectId]
  );

  const editFilteredBuildings = useMemo(() =>
    editData.projectId ? allBuildings.filter(b => b.projectId === editData.projectId) : allBuildings,
    [allBuildings, editData.projectId]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      const matchesSearch = !search ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.assignedTo?.name.toLowerCase().includes(search.toLowerCase()) ||
        t.project?.name.toLowerCase().includes(search.toLowerCase()) ||
        t.project?.projectNumber.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = !statusFilter || t.status === statusFilter;
      const matchesProject = !projectFilter || t.project?.id === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
    });

    if (sortCol) {
      result = [...result].sort((a, b) => {
        let av = '';
        let bv = '';
        switch (sortCol) {
          case 'title': av = a.title.toLowerCase(); bv = b.title.toLowerCase(); break;
          case 'assignedTo': av = a.assignedTo?.name?.toLowerCase() ?? ''; bv = b.assignedTo?.name?.toLowerCase() ?? ''; break;
          case 'status': {
            const order: Record<string, number> = { Pending: 0, 'In Progress': 1, 'Waiting for Approval': 2, Completed: 3, Cancelled: 4 };
            return sortDir === 'asc' ? (order[a.status] ?? 99) - (order[b.status] ?? 99) : (order[b.status] ?? 99) - (order[a.status] ?? 99);
          }
          case 'project': av = a.project?.projectNumber ?? ''; bv = b.project?.projectNumber ?? ''; break;
          case 'building': av = a.building?.designation ?? ''; bv = b.building?.designation ?? ''; break;
          case 'taskInputDate': av = a.taskInputDate ?? ''; bv = b.taskInputDate ?? ''; break;
          case 'dueDate': av = a.dueDate ?? ''; bv = b.dueDate ?? ''; break;
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, search, statusFilter, projectFilter, sortCol, sortDir]);

  const formatDate = (d: string | null) => {
    if (!d) return null;
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  };

  const isOverdue = (dueDate: string, status: string) =>
    status !== 'Completed' && new Date(dueDate) < new Date();

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {
      showAlert('Failed to delete task', { type: 'error' });
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAdd.title.trim()) {
      showAlert('Please enter a task title', { type: 'warning' });
      return;
    }
    if (!quickAdd.dueDate) {
      showAlert('Please enter a due date', { type: 'warning' });
      return;
    }
    try {
      setCreating(true);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickAdd.title,
          assignedToId: quickAdd.assignedToId || null,
          projectId: quickAdd.projectId || null,
          buildingId: quickAdd.buildingId || null,
          status: quickAdd.status,
          taskInputDate: quickAdd.taskInputDate || null,
          dueDate: quickAdd.dueDate,
          priority: 'Medium',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create task');
      }
      const newTask = await res.json();
      setTasks(prev => [newTask, ...prev]);
      setQuickAdd({
        title: '',
        assignedToId: '',
        projectId: '',
        buildingId: '',
        status: 'In Progress',
        taskInputDate: new Date().toISOString().split('T')[0],
        dueDate: '',
      });
      setShowQuickAdd(false);
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Failed to create task', { type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    const fmt = (d: string | null) => {
      if (!d) return '';
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };
    setEditData({
      title: task.title,
      assignedToId: task.assignedTo?.id ?? '',
      projectId: task.project?.id ?? '',
      buildingId: task.building?.id ?? '',
      status: task.status,
      taskInputDate: fmt(task.taskInputDate),
      dueDate: fmt(task.dueDate),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editData.title.trim()) {
      showAlert('Title is required', { type: 'error' });
      return;
    }
    if (!editData.dueDate) {
      showAlert('Due date is required', { type: 'error' });
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editData.title,
          assignedToId: editData.assignedToId || null,
          projectId: editData.projectId || null,
          buildingId: editData.buildingId || null,
          status: editData.status,
          taskInputDate: editData.taskInputDate || null,
          dueDate: editData.dueDate,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update task');
      }
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === editingId ? updated : t));
      cancelEdit();
      router.refresh();
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Failed to update task', { type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  const hasFilters = !!(search || statusFilter || projectFilter);

  return (
    <div className="space-y-4">
      <AlertDialog />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 min-w-0">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 px-2 rounded-md border bg-background text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Approval">Waiting for Approval</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="h-9 px-2 rounded-md border bg-background text-sm"
          >
            <option value="">All Projects</option>
            {allProjects.map(p => (
              <option key={p.id} value={p.id}>{p.projectNumber} — {p.name}</option>
            ))}
          </select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setStatusFilter(''); setProjectFilter(''); }}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="size-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={() => setShowQuickAdd(v => !v)}
            className={cn(
              showQuickAdd
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            <Plus className="size-4 mr-1" />
            {showQuickAdd ? 'Cancel Quick Add' : 'Quick Add'}
          </Button>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground">
        {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        {tasks.length !== filteredTasks.length && ` (of ${tasks.length} total)`}
      </p>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none min-w-[200px]"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">Task Name {sortIcon('title')}</div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none min-w-[140px]"
                onClick={() => handleSort('assignedTo')}
              >
                <div className="flex items-center">Assigned To {sortIcon('assignedTo')}</div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none min-w-[160px]"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">Status {sortIcon('status')}</div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none min-w-[140px]"
                onClick={() => handleSort('project')}
              >
                <div className="flex items-center">Project {sortIcon('project')}</div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none min-w-[120px]"
                onClick={() => handleSort('building')}
              >
                <div className="flex items-center">Building {sortIcon('building')}</div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none min-w-[110px]"
                onClick={() => handleSort('taskInputDate')}
              >
                <div className="flex items-center">Input Date {sortIcon('taskInputDate')}</div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none min-w-[110px]"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center">Due Date {sortIcon('dueDate')}</div>
              </TableHead>
              <TableHead className="text-right w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Quick add row */}
            {canCreate && showQuickAdd && (
              <TableRow className="bg-emerald-50/50">
                <TableCell>
                  <Input
                    placeholder="Task title..."
                    value={quickAdd.title}
                    onChange={e => setQuickAdd(q => ({ ...q, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                    autoFocus
                    disabled={creating}
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <select
                    value={quickAdd.assignedToId}
                    onChange={e => setQuickAdd(q => ({ ...q, assignedToId: e.target.value }))}
                    className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                    disabled={creating}
                  >
                    <option value="">Unassigned</option>
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    value={quickAdd.status}
                    onChange={e => setQuickAdd(q => ({ ...q, status: e.target.value }))}
                    className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                    disabled={creating}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Approval">Waiting for Approval</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    value={quickAdd.projectId}
                    onChange={e => setQuickAdd(q => ({ ...q, projectId: e.target.value, buildingId: '' }))}
                    className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                    disabled={creating}
                  >
                    <option value="">No Project</option>
                    {allProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.projectNumber}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    value={quickAdd.buildingId}
                    onChange={e => setQuickAdd(q => ({ ...q, buildingId: e.target.value }))}
                    className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                    disabled={creating || !quickAdd.projectId}
                  >
                    <option value="">{quickAdd.projectId ? 'No Building' : '— select project first —'}</option>
                    {filteredBuildings.map(b => (
                      <option key={b.id} value={b.id}>{b.designation} — {b.name}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={quickAdd.taskInputDate}
                    onChange={e => setQuickAdd(q => ({ ...q, taskInputDate: e.target.value }))}
                    className="h-8 text-sm"
                    disabled={creating}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={quickAdd.dueDate}
                    onChange={e => setQuickAdd(q => ({ ...q, dueDate: e.target.value }))}
                    className={cn('h-8 text-sm', !quickAdd.dueDate && 'border-red-300')}
                    disabled={creating}
                    required
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" onClick={handleQuickAdd} disabled={creating} className="h-7 px-2 text-xs">
                      {creating ? <Loader2 className="size-3 animate-spin" /> : 'Add'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowQuickAdd(false)} disabled={creating} className="h-7 px-2 text-xs">
                      ✕
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {filteredTasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}

            {filteredTasks.map(task => {
              const isEditing = editingId === task.id;
              const overdue = task.dueDate && isOverdue(task.dueDate, task.status);

              return (
                <TableRow
                  key={task.id}
                  className={cn(
                    task.status === 'Completed' && 'bg-green-50/60 border-l-4 border-l-green-500',
                    overdue && task.status !== 'Completed' && 'bg-red-50/40 border-l-4 border-l-red-400',
                    isEditing && 'bg-blue-50/50',
                  )}
                >
                  {/* Task name */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editData.title}
                        onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                        className="h-8 text-sm"
                        disabled={updating}
                      />
                    ) : (
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {task.title}
                      </Link>
                    )}
                  </TableCell>

                  {/* Assigned to */}
                  <TableCell>
                    {isEditing ? (
                      <select
                        value={editData.assignedToId}
                        onChange={e => setEditData(d => ({ ...d, assignedToId: e.target.value }))}
                        className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                        disabled={updating}
                      >
                        <option value="">Unassigned</option>
                        {allUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    ) : (
                      task.assignedTo ? (
                        <div>
                          <p className="text-sm">{task.assignedTo.name}</p>
                          {task.assignedTo.position && (
                            <p className="text-xs text-muted-foreground">{task.assignedTo.position}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {isEditing ? (
                      <select
                        value={editData.status}
                        onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                        className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                        disabled={updating}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Waiting for Approval">Waiting for Approval</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <Badge variant="outline" className={statusColors[task.status] ?? ''}>
                        {task.status}
                      </Badge>
                    )}
                  </TableCell>

                  {/* Project */}
                  <TableCell>
                    {isEditing ? (
                      <select
                        value={editData.projectId}
                        onChange={e => setEditData(d => ({ ...d, projectId: e.target.value, buildingId: '' }))}
                        className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                        disabled={updating}
                      >
                        <option value="">No Project</option>
                        {allProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.projectNumber}</option>
                        ))}
                      </select>
                    ) : (
                      task.project ? (
                        <div>
                          <p className="text-sm font-medium">{task.project.projectNumber}</p>
                          <p className="text-xs text-muted-foreground">{task.project.name}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )
                    )}
                  </TableCell>

                  {/* Building */}
                  <TableCell>
                    {isEditing ? (
                      <select
                        value={editData.buildingId}
                        onChange={e => setEditData(d => ({ ...d, buildingId: e.target.value }))}
                        className="w-full h-8 px-2 rounded-md border bg-background text-sm"
                        disabled={updating || !editData.projectId}
                      >
                        <option value="">{editData.projectId ? 'No Building' : '— select project first —'}</option>
                        {editFilteredBuildings.map(b => (
                          <option key={b.id} value={b.id}>{b.designation} — {b.name}</option>
                        ))}
                      </select>
                    ) : (
                      task.building ? (
                        <div>
                          <p className="text-sm">{task.building.name}</p>
                          <p className="text-xs text-muted-foreground">{task.building.designation}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )
                    )}
                  </TableCell>

                  {/* Input date */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.taskInputDate}
                        onChange={e => setEditData(d => ({ ...d, taskInputDate: e.target.value }))}
                        className="h-8 text-sm"
                        disabled={updating}
                      />
                    ) : (
                      <span className="text-sm">{formatDate(task.taskInputDate) ?? <span className="text-muted-foreground">—</span>}</span>
                    )}
                  </TableCell>

                  {/* Due date */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editData.dueDate}
                        onChange={e => setEditData(d => ({ ...d, dueDate: e.target.value }))}
                        className={cn('h-8 text-sm', !editData.dueDate && 'border-red-300')}
                        disabled={updating}
                        required
                      />
                    ) : (
                      task.dueDate ? (
                        <div className={cn('flex items-center gap-1', overdue && 'text-destructive')}>
                          {overdue && <AlertCircle className="size-3" />}
                          <span className="text-sm">{formatDate(task.dueDate)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={updating}
                          className="h-7 px-2 text-xs"
                        >
                          {updating ? <Loader2 className="size-3 animate-spin" /> : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEdit}
                          disabled={updating}
                          className="h-7 px-2 text-xs"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/tasks/${task.id}`} className="flex items-center gap-2">
                              <Eye className="size-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => startEdit(task)}
                            className="flex items-center gap-2"
                          >
                            <Edit className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(task.id)}
                            className="flex items-center gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
