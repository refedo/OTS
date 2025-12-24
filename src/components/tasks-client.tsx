'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, Plus, LayoutGrid, List, MoreVertical, Eye, Edit, Trash2, Calendar, User, AlertCircle, CheckSquare, Square, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type Task = {
  id: string;
  title: string;
  description: string | null;
  taskInputDate: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  assignedTo: { id: string; name: string; email: string; position: string | null } | null;
  createdBy: { id: string; name: string; email: string };
  project: { id: string; projectNumber: string; name: string } | null;
  building: { id: string; designation: string; name: string } | null;
  department: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

const statusColors = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
  Completed: 'bg-green-100 text-green-800 border-green-300',
};

const priorityColors = {
  Low: 'bg-gray-100 text-gray-800 border-gray-300',
  Medium: 'bg-orange-100 text-orange-800 border-orange-300',
  High: 'bg-red-100 text-red-800 border-red-300',
};

type User = {
  id: string;
  name: string;
  email: string;
  position: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
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

type Department = {
  id: string;
  name: string;
};

type TasksClientProps = {
  initialTasks: Task[];
  userRole: string;
  userId: string;
  allUsers: User[];
  allProjects: Project[];
  allBuildings: Building[];
  allDepartments: Department[];
  userPermissions: string[];
};

export function TasksClient({ initialTasks, userRole, userId, allUsers, allProjects, allBuildings, allDepartments, userPermissions }: TasksClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('In Progress');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [buildingFilter, setBuildingFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    title: '',
    assignedToId: '',
    projectId: '',
    buildingId: '',
    departmentId: '',
    priority: 'Medium',
    taskInputDate: new Date().toISOString().split('T')[0],
    dueDate: '',
  });
  const [creating, setCreating] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreateTask = userPermissions.includes('tasks.create');

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = !search || 
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase()) ||
        task.assignedTo?.name.toLowerCase().includes(search.toLowerCase()) ||
        task.project?.name.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      const matchesProject = !projectFilter || task.project?.id === projectFilter;
      const matchesBuilding = !buildingFilter || task.building?.id === buildingFilter;
      const matchesDepartment = !departmentFilter || task.department?.id === departmentFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesProject && matchesBuilding && matchesDepartment;
    });
  }, [tasks, search, statusFilter, priorityFilter, projectFilter, buildingFilter, departmentFilter]);

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      alert('Failed to delete task');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} task(s)?`)) return;

    try {
      setIsDeleting(true);
      const deletePromises = Array.from(selectedTasks).map(taskId =>
        fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      setTasks(tasks.filter(t => !selectedTasks.has(t.id)));
      setSelectedTasks(new Set());
      router.refresh();
    } catch (error) {
      alert('Failed to delete some tasks');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTasks.size === 0) return;
    
    const incompleteTasks = tasks.filter(t => selectedTasks.has(t.id) && t.status !== 'Completed');
    
    if (incompleteTasks.length === 0) {
      alert('All selected tasks are already completed');
      return;
    }

    if (!confirm(`Mark ${incompleteTasks.length} task(s) as completed?`)) return;

    try {
      setIsDeleting(true); // Reuse the loading state
      const updatePromises = incompleteTasks.map(task =>
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Completed' }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const updatedTasks = await Promise.all(responses.map(r => r.json()));

      // Update tasks in state
      setTasks(tasks.map(t => {
        const updated = updatedTasks.find(ut => ut.id === t.id);
        return updated || t;
      }));
      
      setSelectedTasks(new Set());
      router.refresh();
    } catch (error) {
      alert('Failed to complete some tasks');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkUncomplete = async () => {
    if (selectedTasks.size === 0) return;
    
    const completedTasks = tasks.filter(t => selectedTasks.has(t.id) && t.status === 'Completed');
    
    if (completedTasks.length === 0) {
      alert('No completed tasks selected');
      return;
    }

    if (!confirm(`Mark ${completedTasks.length} task(s) as incomplete (In Progress)?`)) return;

    try {
      setIsDeleting(true);
      const updatePromises = completedTasks.map(task =>
        fetch(`/api/tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'In Progress' }),
        })
      );

      const responses = await Promise.all(updatePromises);
      const updatedTasks = await Promise.all(responses.map(r => r.json()));

      // Update tasks in state
      setTasks(tasks.map(t => {
        const updated = updatedTasks.find(ut => ut.id === t.id);
        return updated || t;
      }));
      
      setSelectedTasks(new Set());
      router.refresh();
    } catch (error) {
      alert('Failed to uncomplete some tasks');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Completed' ? 'In Progress' : 'Completed';
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      router.refresh();
    } catch (error) {
      alert('Failed to update task status');
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddData.title.trim()) {
      alert('Please enter a task title');
      return;
    }

    if (!quickAddData.dueDate) {
      alert('Please enter a due date');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickAddData.title,
          assignedToId: quickAddData.assignedToId || null,
          projectId: quickAddData.projectId || null,
          buildingId: quickAddData.buildingId || null,
          departmentId: quickAddData.departmentId || null,
          priority: quickAddData.priority,
          taskInputDate: quickAddData.taskInputDate || null,
          dueDate: quickAddData.dueDate,
          status: 'In Progress',
        }),
      });

      if (!response.ok) throw new Error('Failed to create task');

      const newTask = await response.json();
      setTasks([newTask, ...tasks]);
      setQuickAddData({ 
        title: '', 
        assignedToId: '', 
        projectId: '', 
        buildingId: '',
        departmentId: '', 
        priority: 'Medium', 
        taskInputDate: new Date().toISOString().split('T')[0],
        dueDate: '' 
      });
      router.refresh();
    } catch (error) {
      alert('Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'Completed') return false;
    return new Date(dueDate) < new Date();
  };

  const getOverdueDays = (dueDate: string, status: string) => {
    if (status === 'Completed') return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getOverdueColor = (overdueDays: number) => {
    if (overdueDays === 0) return '';
    if (overdueDays <= 3) return 'bg-amber-50 border-l-4 border-l-amber-500';
    return 'bg-red-50 border-l-4 border-l-red-500';
  };

  const getCompletionStatus = (task: Task) => {
    if (task.status !== 'Completed' || !task.dueDate) return null;
    
    const completionDate = new Date(task.updatedAt);
    const dueDate = new Date(task.dueDate);
    
    // Set both to start of day for fair comparison
    completionDate.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((completionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { status: 'early', label: 'Early', days: Math.abs(diffDays), color: 'text-green-600' };
    } else if (diffDays === 0) {
      return { status: 'ontime', label: 'On Time', days: 0, color: 'text-blue-600' };
    } else {
      return { status: 'delayed', label: 'Delayed', days: diffDays, color: 'text-red-600' };
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 lg:p-8 space-y-6 max-lg:pt-20">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track your tasks
            </p>
          </div>
          {canCreateTask && (
            <div className="flex gap-2">
              <Button onClick={() => setShowQuickAdd(!showQuickAdd)}>
                <Plus className="size-4 mr-2" />
                {showQuickAdd ? 'Hide Quick Add' : 'Quick Add Task'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/tasks/new">
                  <Plus className="size-4 mr-2" />
                  Full Form
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedTasks.size > 0 && (
          <Card className="border-primary">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedTasks.size} task(s) selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTasks(new Set())}
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkComplete}
                    disabled={isDeleting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckSquare className="size-4 mr-2" />
                        Complete
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkUncomplete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Square className="size-4 mr-2" />
                        Uncomplete
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter buttons */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* View Toggle */}
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                  >
                    <List className="size-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                </div>

                <div className="h-6 w-px bg-border" />

                {/* Status filters */}
                <span className="text-sm text-muted-foreground">Status:</span>
                <Button
                  variant={statusFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'Pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Pending')}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'In Progress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('In Progress')}
                >
                  In Progress
                </Button>
                <Button
                  variant={statusFilter === 'Completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('Completed')}
                >
                  Completed
                </Button>

                <div className="h-6 w-px bg-border" />

                {/* Priority filters */}
                <span className="text-sm text-muted-foreground">Priority:</span>
                <Button
                  variant={priorityFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('')}
                >
                  All
                </Button>
                <Button
                  variant={priorityFilter === 'High' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('High')}
                >
                  High
                </Button>
                <Button
                  variant={priorityFilter === 'Medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('Medium')}
                >
                  Medium
                </Button>
                <Button
                  variant={priorityFilter === 'Low' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriorityFilter('Low')}
                >
                  Low
                </Button>
              </div>

              {/* Additional Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Filters:</span>
                
                {/* Project Filter */}
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">All Projects</option>
                  {allProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectNumber} - {project.name}
                    </option>
                  ))}
                </select>

                {/* Building Filter */}
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">All Buildings</option>
                  {allBuildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name} ({building.designation})
                    </option>
                  ))}
                </select>

                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-9 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="">All Departments</option>
                  {allDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Display */}
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {search || statusFilter || priorityFilter
                  ? 'No tasks found matching your filters'
                  : 'No tasks yet. Create your first task!'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Input Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Quick Add Row */}
                  {canCreateTask && showQuickAdd && (
                    <TableRow className="bg-muted/50">
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        <Input
                          placeholder="Task title..."
                          value={quickAddData.title}
                          onChange={(e) => setQuickAddData({ ...quickAddData, title: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                          autoFocus
                          disabled={creating}
                        />
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.assignedToId}
                          onChange={(e) => {
                            const selectedUser = allUsers.find(u => u.id === e.target.value);
                            setQuickAddData({ 
                              ...quickAddData, 
                              assignedToId: e.target.value,
                              departmentId: selectedUser?.departmentId || ''
                            });
                          }}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="">Unassigned</option>
                          {allUsers.map((user) => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.departmentId}
                          onChange={(e) => setQuickAddData({ ...quickAddData, departmentId: e.target.value })}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="">No Dept</option>
                          {allDepartments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.projectId}
                          onChange={(e) => {
                            const newProjectId = e.target.value;
                            setQuickAddData({ 
                              ...quickAddData, 
                              projectId: newProjectId,
                              buildingId: '' // Reset building when project changes
                            });
                          }}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="">No Project</option>
                          {allProjects.map((project) => (
                            <option key={project.id} value={project.id}>{project.projectNumber}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.buildingId}
                          onChange={(e) => setQuickAddData({ ...quickAddData, buildingId: e.target.value })}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating || !quickAddData.projectId}
                        >
                          <option value="">{quickAddData.projectId ? 'No Building' : 'Select Project First'}</option>
                          {allBuildings
                            .filter(building => !quickAddData.projectId || building.projectId === quickAddData.projectId)
                            .map((building) => (
                              <option key={building.id} value={building.id}>{building.designation}</option>
                            ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          value={quickAddData.priority}
                          onChange={(e) => setQuickAddData({ ...quickAddData, priority: e.target.value })}
                          className="w-full h-9 px-2 rounded-md border bg-background text-sm"
                          disabled={creating}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={quickAddData.taskInputDate}
                          onChange={(e) => setQuickAddData({ ...quickAddData, taskInputDate: e.target.value })}
                          className="h-9 text-sm"
                          disabled={creating}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={quickAddData.dueDate}
                          onChange={(e) => setQuickAddData({ ...quickAddData, dueDate: e.target.value })}
                          className={cn("h-9 text-sm", !quickAddData.dueDate && "border-red-300")}
                          disabled={creating}
                          required
                        />
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" onClick={handleQuickAdd} disabled={creating}>
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowQuickAdd(false)} disabled={creating}>
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredTasks.map((task) => {
                    const overdueDays = task.dueDate ? getOverdueDays(task.dueDate, task.status) : 0;
                    const overdueColor = getOverdueColor(overdueDays);
                    
                    return (
                    <TableRow key={task.id} className={overdueColor}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleToggleComplete(task.id, task.status)}
                          title={task.status === 'Completed' ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {task.status === 'Completed' ? (
                            <CheckSquare className="h-6 w-6 text-green-600" />
                          ) : (
                            <Square className="h-6 w-6 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.assignedTo ? (
                          <div>
                            <p>{task.assignedTo.name}</p>
                            {task.assignedTo.position && (
                              <p className="text-xs text-muted-foreground">{task.assignedTo.position}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.department ? (
                          <span className="text-sm">{task.department.name}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.project ? (
                          <div>
                            <p className="text-sm">{task.project.projectNumber}</p>
                            <p className="text-xs text-muted-foreground">{task.project.name}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.building ? (
                          <div>
                            <p className="text-sm">{task.building.name}</p>
                            <p className="text-xs text-muted-foreground">{task.building.designation}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={priorityColors[task.priority as keyof typeof priorityColors]}
                        >
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[task.status as keyof typeof statusColors]}
                        >
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.taskInputDate ? (
                          <span className="text-sm">{formatDate(task.taskInputDate)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <div className={cn(
                            "flex items-center gap-1",
                            isOverdue(task.dueDate, task.status) && "text-destructive"
                          )}>
                            {isOverdue(task.dueDate, task.status) && (
                              <AlertCircle className="size-3" />
                            )}
                            <span className="text-sm">{formatDate(task.dueDate)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.status === 'Completed' ? (
                          <div className="text-sm">
                            <div className="font-medium">{formatDate(task.updatedAt)}</div>
                            {(() => {
                              const completionStatus = getCompletionStatus(task);
                              return completionStatus ? (
                                <div className={cn("text-xs font-medium", completionStatus.color)}>
                                  {completionStatus.label}
                                  {completionStatus.days > 0 && ` (+${completionStatus.days}d)`}
                                  {completionStatus.days < 0 && ` (-${completionStatus.days}d)`}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}`)}>
                              <Eye className="size-4" />
                              View Details
                            </DropdownMenuItem>
                            {canCreateTask && (
                              <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}/edit`)}>
                                <Edit className="size-4" />
                                Edit Task
                              </DropdownMenuItem>
                            )}
                            {userRole === 'Admin' && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(task.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 flex-shrink-0">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}`)}>
                          <Eye className="size-4" />
                          View Details
                        </DropdownMenuItem>
                        {canCreateTask && (
                          <DropdownMenuItem onClick={() => router.push(`/tasks/${task.id}/edit`)}>
                            <Edit className="size-4" />
                            Edit Task
                          </DropdownMenuItem>
                        )}
                        {userRole === 'Admin' && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(task.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className={statusColors[task.status as keyof typeof statusColors]}
                    >
                      {task.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={priorityColors[task.priority as keyof typeof priorityColors]}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  {task.description && (
                    <p className="text-muted-foreground line-clamp-2">{task.description}</p>
                  )}

                  {task.assignedTo && (
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{task.assignedTo.name}</p>
                        {task.assignedTo.position && (
                          <p className="text-xs text-muted-foreground">{task.assignedTo.position}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {task.project && (
                    <div className="text-xs">
                      <p className="text-muted-foreground">Project</p>
                      <p className="font-medium">{task.project.projectNumber} - {task.project.name}</p>
                    </div>
                  )}

                  {task.dueDate && (
                    <div className={cn(
                      "flex items-center gap-2",
                      isOverdue(task.dueDate, task.status) && "text-destructive"
                    )}>
                      <Calendar className="size-4" />
                      <div>
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className="font-medium flex items-center gap-1">
                          {isOverdue(task.dueDate, task.status) && (
                            <AlertCircle className="size-3" />
                          )}
                          {formatDate(task.dueDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
